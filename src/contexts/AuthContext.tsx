import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, ConfirmationResult } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
  user: User | null;
  authToken: string | null;
  confirmationResult: ConfirmationResult | null;
  setConfirmationResult: (result: ConfirmationResult | null) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onIdTokenChanged fires when the user signs in, signs out, or changing their token
    const unsubscribe = auth.onIdTokenChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true);
          localStorage.setItem('authToken', token);
          setAuthToken(token);
        } catch (error) {
          console.error("Error fetching token:", error);
        }
      } else {
        localStorage.removeItem('authToken');
        setAuthToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await auth.signOut();
    localStorage.removeItem('authToken');
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, authToken, confirmationResult, setConfirmationResult, loading, signOut }}>
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
