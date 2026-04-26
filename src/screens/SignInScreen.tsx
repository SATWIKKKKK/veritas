import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  AuthError,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { sendOtp } from '../lib/api';
import { cn } from '../lib/utils';

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Incorrect email or password.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/popup-closed-by-user': return 'Sign-in popup was closed. Please try again.';
    case 'auth/popup-blocked': return 'Popup was blocked by your browser. Please allow popups and try again.';
    default: return 'Something went wrong. Please try again.';
  }
}

export default function SignInScreen() {
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
      navigate('/verify', { state: { otpSent: false } });
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return; }

    setError('');
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await credential.user.getIdToken();
      await afterFirebaseAuth(token);
    } catch (err) {
      const authErr = err as AuthError;
      setError(getFirebaseErrorMessage(authErr.code));
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
    <div className="min-h-screen flex flex-col relative z-10">
      <main className="flex-grow flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-surface-container-lowest/90 backdrop-blur-md p-10 md:p-14 rounded-[16px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] border border-surface-variant relative overflow-hidden">

          {/* Structural accent line */}
          <div className="absolute top-0 left-0 w-full h-px bg-outline-variant/30" />

          {/* Brand & headline */}
          <div className="mb-12 text-center">
            <span className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest block mb-4">
              Veritas Workspace
            </span>
            <h1 className="font-headline-lg text-4xl sm:text-5xl md:text-headline-lg text-primary mt-2 leading-tight">
              Welcome Back.
            </h1>
          </div>

          {/* Email/Password form */}
          <form className="space-y-8" onSubmit={handleEmailSignIn} noValidate>
            <div className="relative">
              <label
                className="block font-technical-mono text-technical-mono text-on-surface-variant uppercase tracking-wider mb-2"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={loading}
                className="input-minimal w-full font-body-lg text-body-lg text-on-background py-3 placeholder:text-outline-variant"
              />
            </div>

            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <label
                  className="block font-technical-mono text-technical-mono text-on-surface-variant uppercase tracking-wider"
                  htmlFor="password"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="font-technical-mono text-technical-mono text-secondary hover:text-primary transition-colors underline decoration-outline-variant underline-offset-4"
                >
                  Forgot?
                </button>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                disabled={loading}
                className="input-minimal w-full font-body-lg text-body-lg text-on-background py-3 placeholder:text-outline-variant"
              />
            </div>

            {error && (
              <p className="font-technical-mono text-technical-mono text-error !mt-0">
                {error}
              </p>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full bg-primary text-on-primary font-ui-label text-ui-label py-4 rounded-full transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-60',
                  loading ? 'bg-primary/80' : 'hover:bg-tertiary-container',
                )}
              >
                <span>{loading ? 'Signing In…' : 'Sign In'}</span>
                {!loading && (
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-surface-variant" />
            <span className="font-technical-mono text-technical-mono text-on-surface-variant">OR CONTINUE WITH</span>
            <div className="h-px flex-1 bg-surface-variant" />
          </div>

          {/* Google */}
          <div className="mt-8">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full border border-surface-variant bg-transparent text-primary font-ui-label text-ui-label py-3 rounded-full hover:bg-surface-container-low transition-colors duration-200 flex items-center justify-center gap-3 disabled:opacity-60"
            >
              <GoogleIcon />
              <span>Sign In with Google</span>
            </button>
          </div>

          {/* Switch to sign up */}
          <div className="mt-12 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-primary font-medium hover:underline underline-offset-4 decoration-primary"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-surface-variant relative z-10">
        <div className="max-w-5xl mx-auto px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="font-technical-mono text-technical-mono text-on-surface-variant uppercase tracking-widest">
            © 2024 Veritas. All rights reserved.
          </div>
          <nav className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Security', 'Architecture'].map((item) => (
              <a
                key={item}
                href="#"
                className="font-technical-mono text-technical-mono text-on-surface-variant hover:text-on-surface transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      </footer>
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
