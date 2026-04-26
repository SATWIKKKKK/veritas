import {
  authenticateRequest,
  clearOtpChallenge,
  hasReachedOtpAttemptLimit,
  HttpError,
  incrementOtpAttempts,
  isOtpExpired,
  matchesOtpCode,
  persistOtpChallenge,
  readOtpChallenge,
  readOtpCodeFromBody,
  type RequestLike,
  type ResponseLike,
} from '../_lib/otp.js';

function respondWithError(res: ResponseLike, error: unknown) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  console.error('verify-otp failed:', error);
  res.status(500).json({ message: 'Failed to verify OTP.' });
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ message: 'Method not allowed.' });
    return;
  }

  try {
    const user = await authenticateRequest(req);
    const challenge = readOtpChallenge(req);
    const code = readOtpCodeFromBody(req.body);

    if (!challenge) {
      throw new HttpError(400, 'No OTP challenge found. Request a new code.');
    }

    if (!/^\d{6}$/.test(code)) {
      throw new HttpError(400, 'OTP code must be exactly 6 digits.');
    }

    if (challenge.uid !== user.uid) {
      clearOtpChallenge(res);
      throw new HttpError(403, 'OTP challenge belongs to a different account. Sign in again.');
    }

    if (isOtpExpired(challenge)) {
      clearOtpChallenge(res);
      throw new HttpError(400, 'Code expired. Please request a new one.');
    }

    if (!matchesOtpCode(challenge, code)) {
      const nextChallenge = incrementOtpAttempts(challenge);

      if (hasReachedOtpAttemptLimit(nextChallenge)) {
        clearOtpChallenge(res);
        throw new HttpError(429, 'Too many attempts. Please request a new code.');
      }

      persistOtpChallenge(res, nextChallenge);
      throw new HttpError(400, 'Invalid or expired OTP');
    }

    clearOtpChallenge(res);
    res.status(204).end();
  } catch (error) {
    respondWithError(res, error);
  }
}