import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}

import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { ShieldAlert, AlertCircle, ArrowRight } from 'lucide-react';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setConfirmationResult } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          setError('reCAPTCHA expired. Please try again.');
        }
      });
    }
  }, []);

  const validatePhone = (p: string) => {
    // Basic validation: just digits and appropriate length
    const digitsPattern = /^\d{10}$/; // Example for US
    // To support broader international we can just allow numbers with length >= 7
    const stripped = p.replace(/\D/g, '');
    return stripped.length >= 7;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const strippedPhone = phone.replace(/\D/g, '');
    if (!validatePhone(strippedPhone)) {
      setError('Invalid number format');
      return;
    }

    const fullPhoneNumber = `${countryCode}${strippedPhone}`;
    setLoading(true);

    try {
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) throw new Error("reCAPTCHA missing");

      const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(confirmationResult);
      navigate('/verify');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number provided.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later.');
      } else {
        setError(err.message || 'Failed to send OTP. Try again.');
      }
      
      // Reset recaptcha if failed
      if (window.recaptchaVerifier && typeof window !== 'undefined' && (window as any).grecaptcha) {
        window.recaptchaVerifier.render().then(widgetId => {
          (window as any).grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative z-10 w-full max-w-[420px] px-6 mx-auto mt-20 md:mt-32">
      <div id="recaptcha-container"></div>
      
      <div className="bg-surface-container-lowest rounded-xl soft-float border border-surface-variant p-10 md:p-12 relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
        
        {/* Header Area */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-container mb-6">
            <span className="material-symbols-outlined text-on-surface text-xl">lock</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-background italic font-bold mb-2 tracking-tight">
            Secure Access
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Enter your registered phone number to receive a one-time passcode.
          </p>
        </div>
        
        {/* Form Area */}
        <form aria-label="Login Form" className="space-y-8" onSubmit={handleSendOtp}>
          {/* Input Group */}
          <div className="relative group">
            <label className="font-ui-label text-ui-label text-on-surface-variant block mb-3 uppercase" htmlFor="phone">
              Phone Number
            </label>
            <div className="flex items-end">
              {/* Country Code Selection */}
              <div className="flex items-center pb-2 border-b border-outline-variant mr-4 text-on-surface font-body-md text-body-md whitespace-nowrap">
                <input 
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-transparent border-none p-0 w-8 focus:ring-0 text-center"
                  maxLength={4}
                />
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant ml-1">expand_more</span>
              </div>
              
              {/* Phone Input */}
              <div className="relative w-full">
                <input 
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="555 012 3456"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (error) setError('');
                  }}
                  className={cn(
                    "w-full bg-transparent border-0 border-b pb-2 font-body-lg text-body-lg text-on-background placeholder-outline transition-colors focus:ring-0 px-0",
                    error ? "border-error focus:border-error" : "border-outline-variant focus:border-primary"
                  )}
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Error State */}
            {error && (
              <div className="absolute -bottom-6 left-0 flex items-center text-error mt-1" id="phone-error">
                <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                <span className="font-technical-mono text-technical-mono">{error}</span>
              </div>
            )}
          </div>
          
          <div className="pt-4 text-center">
            <p className="font-technical-mono text-technical-mono text-on-surface-variant/70 text-[10px]">
              Protected by reCAPTCHA and subject to the <a href="#" className="underline hover:text-on-background transition-colors">Privacy Policy</a> and <a href="#" className="underline hover:text-on-background transition-colors">Terms of Service</a>.
            </p>
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary rounded-full py-4 px-6 font-ui-label text-ui-label uppercase tracking-widest hover:bg-inverse-surface transition-all duration-300 flex justify-center items-center group disabled:opacity-70"
          >
            <span>{loading ? 'Sending...' : 'Send OTP'}</span>
            {!loading && (
              <span className="material-symbols-outlined ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-[18px]">
                arrow_forward
              </span>
            )}
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center">
        <a href="#" className="font-technical-mono text-technical-mono text-on-surface-variant hover:text-on-background transition-colors flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[14px]">help</span>
          Need assistance?
        </a>
      </div>
    </main>
  );
}
