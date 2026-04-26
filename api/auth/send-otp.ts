import {
  authenticateRequest,
  createOtpChallenge,
  deliverOtp,
  HttpError,
  type RequestLike,
  type ResponseLike,
} from '../_lib/otp';

function respondWithError(res: ResponseLike, error: unknown) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  console.error('send-otp failed:', error);
  res.status(500).json({ message: 'Failed to send OTP.' });
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ message: 'Method not allowed.' });
    return;
  }

  try {
    const user = await authenticateRequest(req);
    const challenge = createOtpChallenge(user);
    const result = await deliverOtp(user, challenge.code);

    res.setHeader('Set-Cookie', challenge.cookieHeader);
    res.status(200).json(result);
  } catch (error) {
    respondWithError(res, error);
  }
}