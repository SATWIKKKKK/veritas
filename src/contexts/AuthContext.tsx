import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onIdTokenChanged } from 'firebase/auth';
import { auth, authPersistenceReady } from '../firebase';

interface AuthContextType {
  user: User | null;
  authToken: string | null;
  otpVerified: boolean;
  setOtpVerified: (verified: boolean) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'authToken';
const otpVerifiedKey = (uid: string) => `otpVerified_${uid}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem(AUTH_TOKEN_KEY));
  const [otpVerified, setOtpVerifiedState] = useState(false);
  const [loading, setLoading] = useState(true);

  const setOtpVerified = (verified: boolean) => {
    setOtpVerifiedState(verified);
    if (user) {
      if (verified) {
        localStorage.setItem(otpVerifiedKey(user.uid), 'true');
      } else {
        localStorage.removeItem(otpVerifiedKey(user.uid));
      }
    }
  };

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void authPersistenceReady.finally(() => {
      if (!active) return;

      unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
        setUser(currentUser);

        if (currentUser) {
          try {
            const token = await currentUser.getIdToken(true);
            localStorage.setItem(AUTH_TOKEN_KEY, token);
            setAuthToken(token);
            const verified = localStorage.getItem(otpVerifiedKey(currentUser.uid)) === 'true';
            setOtpVerifiedState(verified);
          } catch {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setAuthToken(null);
            setOtpVerifiedState(false);
          }
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setAuthToken(null);
          setOtpVerifiedState(false);
        }

        if (active) setLoading(false);
      });
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signOut = async () => {
    if (user) localStorage.removeItem(otpVerifiedKey(user.uid));
    await auth.signOut();
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken(null);
    setOtpVerifiedState(false);
  };

  return (
    <AuthContext.Provider value={{ user, authToken, otpVerified, setOtpVerified, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
