import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { AlertCircle } from 'lucide-react';

export default function OtpScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(45);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { confirmationResult } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if no confirmationResult (user refreshed the page)
  if (!confirmationResult) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    // Take only the last character if multiple are pasted
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    setError('');

    // Auto-advance
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
        if(i < 6) newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    
    // Focus next empty input or last
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!confirmationResult) throw new Error("No confirmation result.");
      // This will automatically trigger onIdTokenChanged in AuthContext
      await confirmationResult.confirm(code);
      // Wait a moment for context to process token, though navigation is handled by PrivateRoute logic if we redirect
      navigate('/home');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid code. Please try again.');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else if (err.code === 'auth/code-expired') {
        setError('Code expired. Please request a new one.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(err.message || 'Verification failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formattedTimer = `00:${timer < 10 ? '0' : ''}${timer}`;

  return (
    <main className="flex-grow flex items-center justify-center relative z-10 p-4 md:p-margin mt-10 md:mt-20">
      {/* Floating Card */}
      <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-[14px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] border border-outline-variant/40 p-12 flex flex-col relative soft-float">
        
        {/* Brand Mark */}
        <div className="flex justify-center mb-8">
          <span className="font-display-xl text-primary text-4xl italic">Protocol</span>
        </div>
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-headline-md text-headline-md text-on-surface mb-3">Verify Identity</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            We've sent a 6-digit authentication code to your registered device.
          </p>
        </div>
        
        {/* Verification Form */}
        <div className={cn("flex flex-col gap-8 transition-all", error && "animate-shake")}>
          {/* OTP Input Area */}
          <div className="flex flex-col gap-4">
            <label className="sr-only">One Time Password</label>
            <div className="flex justify-between gap-2 md:gap-3">
              {[0, 1, 2].map((index) => (
                <input 
                  key={`otp-${index}`}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[index]}
                  onChange={(e) => handleChange(index, e)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={cn(
                    "w-12 h-14 md:w-14 md:h-16 text-center font-technical-mono text-body-lg border-0 border-b bg-transparent focus:ring-0 transition-colors focus:bg-surface-container-low",
                    error ? "border-error text-error focus:border-error" : "border-outline focus:border-primary"
                  )}
                />
              ))}
              
              <span className="flex items-center justify-center text-outline-variant w-4">-</span>
              
              {[3, 4, 5].map((index) => (
                <input 
                  key={`otp-${index}`}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[index]}
                  onChange={(e) => handleChange(index, e)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={cn(
                    "w-12 h-14 md:w-14 md:h-16 text-center font-technical-mono text-body-lg border-0 border-b bg-transparent focus:ring-0 transition-colors focus:bg-surface-container-low",
                    error ? "border-error text-error focus:border-error" : "border-outline focus:border-primary"
                  )}
                />
              ))}
            </div>
            
            {/* Error State Message */}
            {error && (
              <div className="flex items-center gap-2 text-error mt-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <p className="font-ui-label text-technical-mono">{error}</p>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex flex-col gap-4 mt-4">
            <button 
              onClick={handleVerify}
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-primary text-on-primary font-ui-label text-ui-label rounded-full py-4 px-6 hover:bg-on-surface-variant transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
              {!loading && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
            </button>
            
            <div className="flex justify-between items-center px-2">
              <button 
                type="button" 
                onClick={() => navigate('/login')}
                className="font-ui-label text-technical-mono text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest bg-transparent border-none cursor-pointer p-0"
              >
                Resend Code
              </button>
              <span className="font-technical-mono text-technical-mono text-outline">{formattedTimer}</span>
            </div>
          </div>
        </div>
        
        {/* Contextual Link back to login */}
        <div className="mt-12 text-center border-t border-outline-variant/30 pt-6">
          <button 
            onClick={() => navigate('/login')}
            className="font-ui-label text-technical-mono text-on-surface-variant hover:text-primary transition-colors inline-flex items-center gap-1 uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Return to Login
          </button>
        </div>
      </div>
    </main>
  );
}
