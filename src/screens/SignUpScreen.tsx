import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  AuthError,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { sendOtp } from '../lib/api';
import { cn } from '../lib/utils';

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/popup-closed-by-user': return 'Sign-in popup was closed. Please try again.';
    case 'auth/popup-blocked': return 'Popup was blocked by your browser. Please allow popups and try again.';
    default: return 'Something went wrong. Please try again.';
  }
}

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const afterFirebaseAuth = async (idToken: string) => {
    try {
      const { debugCode } = await sendOtp(idToken);
      navigate('/verify', { state: { otpSent: true, debugCode } });
    } catch {
      // OTP send failed — still navigate to /verify so user can request a resend
      navigate('/verify', { state: { otpSent: false } });
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!email.trim()) { setError('Please enter your work email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setError('');
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      const token = await credential.user.getIdToken();
      await afterFirebaseAuth(token);
    } catch (err) {
      const authErr = err as AuthError;
      setError(getFirebaseErrorMessage(authErr.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const token = await credential.user.getIdToken();
      await afterFirebaseAuth(token);
    } catch (err) {
      const authErr = err as AuthError;
      setError(getFirebaseErrorMessage(authErr.code));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative z-10">
      <main className="w-full max-w-[480px]">
        <div className="bg-surface-bright/95 backdrop-blur-sm p-8 sm:p-12 rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] border border-outline-variant/30 relative overflow-hidden">

          {/* Brand */}
          <header className="mb-10 text-center sm:text-left">
            <div className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest mb-8">
              Veritas
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary">
              Start Building.
            </h1>
          </header>

          {/* Google Sign Up */}
          <div className="flex flex-col gap-3 mb-8">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-outline rounded text-on-surface font-ui-label text-ui-label hover:bg-surface-container transition-colors duration-200 group disabled:opacity-60"
            >
              <GoogleIcon />
              Sign Up with Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px bg-outline-variant flex-1" />
            <span className="font-technical-mono text-technical-mono text-on-surface-variant uppercase tracking-widest">Or</span>
            <div className="h-px bg-outline-variant flex-1" />
          </div>

          {/* Registration Form */}
          <form className="flex flex-col gap-8" onSubmit={handleEmailSignUp} noValidate>
            <div className="relative flex flex-col">
              <label className="font-ui-label text-ui-label text-on-surface-variant mb-2" htmlFor="fullname">
                Full Name
              </label>
              <input
                id="fullname"
                name="fullname"
                type="text"
                placeholder="Jane Doe"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                disabled={loading}
                className="input-minimal font-body-md text-body-md text-on-background placeholder:text-on-surface-variant/40"
              />
            </div>

            <div className="relative flex flex-col">
              <label className="font-ui-label text-ui-label text-on-surface-variant mb-2" htmlFor="email">
                Work Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="jane@company.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={loading}
                className="input-minimal font-body-md text-body-md text-on-background placeholder:text-on-surface-variant/40"
              />
            </div>

            <div className="relative flex flex-col mb-2">
              <label className="font-ui-label text-ui-label text-on-surface-variant mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                disabled={loading}
                className="input-minimal font-body-md text-body-md text-on-background placeholder:text-on-surface-variant/40"
              />
            </div>

            {error && (
              <p className="font-technical-mono text-technical-mono text-error -mt-4">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full bg-primary text-on-primary py-4 rounded-full font-ui-label text-ui-label uppercase tracking-widest transition-colors mt-2 disabled:opacity-60',
                loading ? 'bg-primary/80' : 'hover:bg-tertiary-container',
              )}
            >
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          {/* Footer link */}
          <div className="mt-8 text-center sm:text-left">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary hover:text-on-surface underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-all ml-1"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
