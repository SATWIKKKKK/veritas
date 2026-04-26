import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const COOKIE_NAME = 'veritas_otp';
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

type HeaderValue = string | string[] | undefined;

export interface RequestLike {
  method?: string;
  headers: Record<string, HeaderValue>;
  body?: unknown;
}

export interface ResponseLike {
  status: (statusCode: number) => ResponseLike;
  setHeader: (name: string, value: string | string[]) => void;
  json: (body: unknown) => void;
  end: (body?: string) => void;
}

interface OtpCookiePayload {
  uid: string;
  codeHash: string;
  exp: number;
  attempts: number;
}

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
}

export interface SendOtpResponseBody {
  ok: true;
  debugCode?: string;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function readEnv(name: string) {
  return (process.env[name] ?? '').trim();
}

function getFirebaseProjectId() {
  const projectId = readEnv('FIREBASE_PROJECT_ID') || readEnv('VITE_FIREBASE_PROJECT_ID');
  if (!projectId) {
    throw new HttpError(500, 'FIREBASE_PROJECT_ID is not configured.');
  }
  return projectId;
}

function getOtpSessionSecret() {
  const secret = readEnv('OTP_SESSION_SECRET');
  if (!secret) {
    throw new HttpError(500, 'OTP_SESSION_SECRET is not configured.');
  }
  return secret;
}

function getHeaderValue(headers: Record<string, HeaderValue>, name: string) {
  const headerKey = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  const headerValue = headerKey ? headers[headerKey] : undefined;
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }
  return headerValue;
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function createSignature(payload: string) {
  return createHmac('sha256', getOtpSessionSecret()).update(payload).digest('base64url');
}

function hashOtpCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

function createCookieHeader(value: string, maxAgeSeconds: number) {
  const segments = [
    `${COOKIE_NAME}=${value}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (readEnv('VERCEL_ENV') === 'production' || readEnv('NODE_ENV') === 'production') {
    segments.push('Secure');
  }

  return segments.join('; ');
}

function readCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader
    .split(';')
    .map((segment) => segment.trim())
    .find((segment) => segment.startsWith(`${name}=`));

  return match ? match.slice(name.length + 1) : null;
}

function serializeOtpPayload(payload: OtpCookiePayload) {
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = createSignature(encoded);
  return `${encoded}.${signature}`;
}

function parseOtpPayload(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  const [encoded, signature] = rawValue.split('.');
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = createSignature(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as OtpCookiePayload;
    if (
      typeof parsed.uid !== 'string'
      || typeof parsed.codeHash !== 'string'
      || typeof parsed.exp !== 'number'
      || typeof parsed.attempts !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function renderOtpEmail(code: string) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; color: #111111; padding: 24px;">
      <p style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #666666; margin: 0 0 16px;">Veritas Workspace</p>
      <h1 style="font-size: 28px; margin: 0 0 12px; font-weight: 600;">Your verification code</h1>
      <p style="font-size: 16px; line-height: 1.5; margin: 0 0 20px;">Use the code below to finish signing in. The code expires in 10 minutes.</p>
      <div style="font-size: 32px; letter-spacing: 0.4em; font-weight: 700; padding: 16px 20px; border: 1px solid #d9d9d9; border-radius: 12px; display: inline-block;">${code}</div>
    </div>
  `;
}

export async function authenticateRequest(req: RequestLike): Promise<AuthenticatedUser> {
  const authorization = getHeaderValue(req.headers, 'authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing Authorization bearer token.');
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw new HttpError(401, 'Authorization bearer token is empty.');
  }

  const projectId = getFirebaseProjectId();
  const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });

  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new HttpError(401, 'Firebase token is missing a subject.');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
  };
}

export function createOtpChallenge(user: AuthenticatedUser) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const payload: OtpCookiePayload = {
    uid: user.uid,
    codeHash: hashOtpCode(code),
    exp: Date.now() + OTP_TTL_MS,
    attempts: 0,
  };

  return {
    code,
    cookieHeader: createCookieHeader(serializeOtpPayload(payload), Math.ceil(OTP_TTL_MS / 1000)),
  };
}

export function clearOtpChallenge(res: ResponseLike) {
  res.setHeader('Set-Cookie', createCookieHeader('', 0));
}

export function readOtpChallenge(req: RequestLike) {
  return parseOtpPayload(readCookieValue(getHeaderValue(req.headers, 'cookie'), COOKIE_NAME));
}

export function persistOtpChallenge(res: ResponseLike, payload: OtpCookiePayload) {
  const remainingSeconds = Math.max(0, Math.ceil((payload.exp - Date.now()) / 1000));
  res.setHeader('Set-Cookie', createCookieHeader(serializeOtpPayload(payload), remainingSeconds));
}

export function incrementOtpAttempts(payload: OtpCookiePayload) {
  return {
    ...payload,
    attempts: payload.attempts + 1,
  };
}

export function isOtpExpired(payload: OtpCookiePayload) {
  return payload.exp <= Date.now();
}

export function hasReachedOtpAttemptLimit(payload: OtpCookiePayload) {
  return payload.attempts >= MAX_OTP_ATTEMPTS;
}

export function matchesOtpCode(payload: OtpCookiePayload, code: string) {
  const actualBuffer = Buffer.from(payload.codeHash);
  const expectedBuffer = Buffer.from(hashOtpCode(code));
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function deliverOtp(user: AuthenticatedUser, code: string): Promise<SendOtpResponseBody> {
  if (!user.email) {
    throw new HttpError(400, 'Authenticated Firebase user does not have an email address.');
  }

  if (readEnv('OTP_DEV_MODE').toLowerCase() === 'true') {
    return {
      ok: true,
      debugCode: code,
    };
  }

  const resendApiKey = readEnv('RESEND_API_KEY');
  const fromAddress = readEnv('OTP_FROM_EMAIL');
  const subject = readEnv('OTP_EMAIL_SUBJECT') || 'Your Veritas verification code';

  if (!resendApiKey || !fromAddress) {
    throw new HttpError(503, 'OTP email delivery is not configured. Set RESEND_API_KEY and OTP_FROM_EMAIL.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [user.email],
      subject,
      html: renderOtpEmail(code),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new HttpError(502, body || 'OTP email delivery failed.');
  }

  return { ok: true };
}

export function readOtpCodeFromBody(body: unknown) {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as { code?: unknown };
      return typeof parsed.code === 'string' ? parsed.code.trim() : '';
    } catch {
      return '';
    }
  }

  if (body && typeof body === 'object' && 'code' in body) {
    const value = (body as { code?: unknown }).code;
    return typeof value === 'string' ? value.trim() : '';
  }

  return '';
}