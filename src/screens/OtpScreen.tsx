import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sendOtp, verifyOtp, ApiError } from '../lib/api';
import { cn } from '../lib/utils';

const RESEND_COOLDOWN = 60;

interface OtpLocationState {
  otpSent?: boolean;
  debugCode?: string;
}

export default function OtpScreen() {
  const { user, authToken, setOtpVerified, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const otpState = location.state as OtpLocationState | null;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(() =>
    otpState?.otpSent ? RESEND_COOLDOWN : 0,
  );
  const [resendLoading, setResendLoading] = useState(false);
  const [debugCode, setDebugCode] = useState(otpState?.debugCode ?? '');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Guard: must be Firebase-authenticated to reach this screen
  if (!user || !authToken) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (otpState?.otpSent === false) {
      setError('We could not send a verification code yet. Try resending the code below.');
    }
  }, [otpState?.otpSent]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') void handleVerify();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    pasted.split('').forEach((ch, i) => { if (i < 6) newOtp[i] = ch; });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter all 6 digits.'); return; }

    setLoading(true);
    setError('');
    try {
      await verifyOtp(authToken, code);
      setOtpVerified(true);
      navigate('/home', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Verification failed. Please try again.');
      }
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    try {
      const { debugCode: nextDebugCode } = await sendOtp(authToken);
      setDebugCode(nextDebugCode ?? '');
      setResendTimer(RESEND_COOLDOWN);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to resend code. Please try again.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const formattedTimer = `00:${resendTimer < 10 ? '0' : ''}${resendTimer}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative z-10">
      <div className="w-full max-w-md bg-surface-container-lowest/90 backdrop-blur-md p-10 md:p-14 rounded-[16px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] border border-surface-variant relative overflow-hidden">

        {/* Structural accent */}
        <div className="absolute top-0 left-0 w-full h-px bg-outline-variant/30" />

        {/* Header */}
        <div className="mb-12 text-center">
          <span className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest block mb-4">
            Veritas Workspace
          </span>
          <h1 className="font-headline-lg text-4xl sm:text-5xl text-primary mt-2 leading-tight">
            Verify Your Account.
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-4">
            A 6-digit code was sent to{' '}
            <span className="text-on-surface font-medium">{user.email}</span>
          </p>
          {import.meta.env.DEV && debugCode && (
            <p className="mt-4 rounded-xl border border-outline-variant/40 bg-surface-container px-4 py-3 font-technical-mono text-technical-mono text-on-surface">
              Development OTP preview: <span className="font-semibold tracking-[0.3em]">{debugCode}</span>
            </p>
          )}
        </div>

        {/* OTP inputs */}
        <div className={cn('flex flex-col gap-8', error && 'animate-shake')}>
          <div>
            <label className="sr-only">One-time passcode</label>
            <div className="flex justify-between gap-2 sm:gap-3">
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[i]}
                  onChange={(e) => handleChange(i, e)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  disabled={loading}
                  className={cn(
                    'flex-1 h-14 sm:h-16 text-center text-xl font-body-lg border-0 border-b-2 bg-transparent focus:outline-none transition-colors',
                    error ? 'border-error text-error' : 'border-outline-variant focus:border-primary',
                  )}
                />
              ))}
              <span className="flex items-center text-outline-variant text-xl select-none">-</span>
              {[3, 4, 5].map((i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[i]}
                  onChange={(e) => handleChange(i, e)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  disabled={loading}
                  className={cn(
                    'flex-1 h-14 sm:h-16 text-center text-xl font-body-lg border-0 border-b-2 bg-transparent focus:outline-none transition-colors',
                    error ? 'border-error text-error' : 'border-outline-variant focus:border-primary',
                  )}
                />
              ))}
            </div>

            {error && (
              <p className="font-technical-mono text-technical-mono text-error mt-3">
                {error}
              </p>
            )}
          </div>

          {/* Verify button */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={loading}
            className="w-full bg-primary text-on-primary font-ui-label text-ui-label py-4 rounded-full hover:bg-tertiary-container transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{loading ? 'Verifying...' : 'Verify Code'}</span>
            {!loading && <span className="material-symbols-outlined text-[18px]">verified_user</span>}
          </button>

          {/* Resend */}
          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="font-technical-mono text-technical-mono text-on-surface-variant">
                Resend code in{' '}
                <span className="text-on-surface tabular-nums">{formattedTimer}</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="font-technical-mono text-technical-mono text-on-surface-variant hover:text-primary underline underline-offset-4 transition-colors disabled:opacity-60"
              >
                {resendLoading ? 'Sending...' : 'Resend code'}
              </button>
            )}
          </div>

          {/* Switch account */}
          <div className="text-center border-t border-surface-variant pt-6">
            <button
              type="button"
              onClick={handleSignOut}
              className="font-technical-mono text-technical-mono text-on-surface-variant hover:text-primary transition-colors"
            >
              Wrong account? Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
