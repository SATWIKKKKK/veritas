const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

export interface SendOtpResult {
  debugCode?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildApiUrl(path: string) {
  return API_BASE ? `${API_BASE}${path}` : `/api${path}`;
}

/**
 * Asks the backend to send an OTP to the authenticated user's contact (email/phone).
 * The backend identifies the user via the Firebase ID token.
 */
export async function sendOtp(idToken: string): Promise<SendOtpResult> {
  const res = await fetch(buildApiUrl('/auth/send-otp'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(res.status, body.message ?? 'Failed to send OTP');
  }

  return (await res.json().catch(() => ({}))) as SendOtpResult;
}

/**
 * Verifies the OTP code with the backend.
 * The backend identifies the user via the Firebase ID token and checks the code.
 */
export async function verifyOtp(idToken: string, code: string): Promise<void> {
  const res = await fetch(buildApiUrl('/auth/verify-otp'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    const message =
      res.status === 429
        ? 'Too many attempts. Please wait and try again.'
        : body.message ?? 'Invalid or expired OTP';
    throw new ApiError(res.status, message);
  }
}
