import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import {
  DEFAULT_COUNTRY_CODE,
  fetchCountryOptions,
  getFallbackCountries,
  resolveCountrySelection,
  type CountryOption,
} from '../lib/countries';
import { cn } from '../lib/utils';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
    recaptchaWidgetId: number | undefined;
    grecaptcha?: {
      reset: (widgetId?: number) => void;
      enterprise?: {
        reset: (widgetId?: number) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

const fallbackCountries = getFallbackCountries();

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [countries, setCountries] = useState<CountryOption[]>(fallbackCountries);
  const [selectedCountryCode, setSelectedCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const { setConfirmationResult, setPendingVerification } = useAuth();
  const navigate = useNavigate();

  // Pre-render the invisible reCAPTCHA verifier as soon as the page mounts.
  // Creating it lazily on submit causes timing/race failures in production.
  useEffect(() => {
    let verifier: RecaptchaVerifier | undefined;
    let cancelled = false;

    const init = async () => {
      try {
        // ensure the correct recaptcha script is loaded (uses Vite env var)
        // dynamic loader lives in src/lib/recaptcha.ts
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { loadRecaptchaEnterprise } = await import('../lib/recaptcha');
        const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string) || '';
        await loadRecaptchaEnterprise(siteKey);

        if (cancelled) return;

        verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => { setError(''); },
          'expired-callback': () => {
            setError('reCAPTCHA expired. Please try again.');
          },
        });

        const widgetId = await verifier.render();
        if (cancelled) {
          verifier.clear();
          return;
        }

        window.recaptchaVerifier = verifier;
        window.recaptchaWidgetId = widgetId;
      } catch (e: any) {
        console.error('RecaptchaVerifier init error:', e);
        setError(e?.message || 'reCAPTCHA initialization failed');
      }
    };

    void init();

    return () => {
      cancelled = true;
      verifier?.clear();
      window.recaptchaVerifier = undefined;
      window.recaptchaWidgetId = undefined;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    const loadCountries = async () => {
      setLoadingCountries(true);

      try {
        const availableCountries = await fetchCountryOptions(abortController.signal);

        if (!active) {
          return;
        }

        setCountries(availableCountries);
        setSelectedCountryCode((currentCode) => resolveCountrySelection(availableCountries, currentCode));
      } catch (fetchError) {
        if (!active || abortController.signal.aborted) {
          return;
        }

        console.error('Unable to load live country dial codes, using package fallback:', fetchError);
        setCountries(fallbackCountries);
        setSelectedCountryCode((currentCode) => resolveCountrySelection(fallbackCountries, currentCode));
      } finally {
        if (active) {
          setLoadingCountries(false);
        }
      }
    };

    void loadCountries();

    return () => {
      active = false;
      abortController.abort();
    };
  }, []);

  const selectedCountry = useMemo(() => {
    return (
      countries.find((country) => country.code === selectedCountryCode) ??
      countries.find((country) => country.code === DEFAULT_COUNTRY_CODE) ??
      fallbackCountries[0]
    );
  }, [countries, selectedCountryCode]);

  const resetRecaptcha = () => {
    const widgetId = window.recaptchaWidgetId;
    if (widgetId !== undefined) {
      // prefer enterprise.reset, fall back to v2 reset
      (window.grecaptcha?.enterprise ?? window.grecaptcha)?.reset(widgetId);
    }
  };

  const validatePhone = (localPhone: string, dialCode: string) => {
    const localDigits = localPhone.replace(/\D/g, '');
    const fullDigits = `${dialCode.replace(/\D/g, '')}${localDigits}`;
    return localDigits.length >= 6 && fullDigits.length >= 8 && fullDigits.length <= 15;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const strippedPhone = phone.replace(/\D/g, '');
    if (!selectedCountry) {
      setError('Country selection is unavailable. Please refresh and try again.');
      return;
    }

    if (!validatePhone(strippedPhone, selectedCountry.dialCode)) {
      setError('Invalid number format');
      return;
    }

    const fullPhoneNumber = `${selectedCountry.dialCode}${strippedPhone}`;
    setLoading(true);

    const appVerifier = window.recaptchaVerifier;
    if (!appVerifier) {
      setError('reCAPTCHA not ready. Please refresh the page and try again.');
      setLoading(false);
      return;
    }

    try {
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);

      setConfirmationResult(confirmationResult);
      setPendingVerification(confirmationResult.verificationId, fullPhoneNumber);
      navigate('/verify');
    } catch (err: any) {
      console.error(err);

      if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number provided.');
      } else if (err.code === 'auth/invalid-app-credential' || err.code === 'auth/missing-app-credential') {
        setError('Firebase phone auth is rejecting the app credential. Check the authorized domain and Phone provider settings.');
      } else if (err.code === 'auth/captcha-check-failed') {
        setError('Invisible reCAPTCHA failed. Refresh the page and try again.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Phone authentication is not enabled in Firebase for this project.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later.');
      } else {
        setError(err.message || 'Failed to send OTP. Try again.');
      }

      resetRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative z-10 w-full max-w-105 px-4 sm:px-6 mx-auto mt-10 sm:mt-16 md:mt-32">
      <div id="recaptcha-container" className="sr-only" aria-hidden="true"></div>

      <div className="bg-surface-container-lowest rounded-xl soft-float border border-surface-variant p-6 sm:p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>

        <div className="mb-8 sm:mb-10 text-center">
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

        <form aria-label="Login Form" className="space-y-8" onSubmit={handleSendOtp}>
          <div className="group">
            <label className="font-ui-label text-ui-label text-on-surface-variant block mb-3 uppercase" htmlFor="phone">
              Phone Number
            </label>
            <div className="flex items-end gap-3 sm:gap-4">
              <div className="relative shrink-0 w-24 sm:w-28">
                <select
                  id="country"
                  name="country"
                  value={selectedCountryCode}
                  onChange={(e) => setSelectedCountryCode(e.target.value)}
                  className="w-full appearance-none bg-transparent border-0 border-b border-outline-variant pb-2 pr-7 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-0 disabled:opacity-70"
                  disabled={loading || loadingCountries}
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.dialCode})
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant absolute right-0 bottom-2 pointer-events-none">expand_more</span>
              </div>

              <div className="relative w-full min-w-0">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="555 012 3456"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (error) {
                      setError('');
                    }
                  }}
                  className={cn(
                    'w-full bg-transparent border-0 border-b pb-2 font-body-lg text-body-lg text-on-background placeholder-outline transition-colors focus:ring-0 px-0',
                    error ? 'border-error focus:border-error' : 'border-outline-variant focus:border-primary',
                  )}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="min-h-6 pt-2" id="phone-error">
              {error && (
                <div className="flex items-start text-error gap-1.5">
                  <span className="material-symbols-outlined text-[14px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                  <span className="font-technical-mono text-technical-mono leading-relaxed wrap-break-word">{error}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 text-center">
            <p className="font-technical-mono text-technical-mono text-on-surface-variant/70 text-[10px]">
              Protected by reCAPTCHA and subject to the <a href="#" className="underline hover:text-on-background transition-colors">Privacy Policy</a> and <a href="#" className="underline hover:text-on-background transition-colors">Terms of Service</a>.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || loadingCountries}
            className="w-full bg-primary text-on-primary rounded-full py-4 px-6 font-ui-label text-ui-label uppercase tracking-widest hover:bg-inverse-surface transition-all duration-300 flex justify-center items-center group disabled:opacity-70"
          >
            <span>{loading ? 'Sending...' : loadingCountries ? 'Loading Countries...' : 'Send OTP'}</span>
            {!loading && !loadingCountries && (
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
