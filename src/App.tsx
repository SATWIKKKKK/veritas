/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import OtpScreen from './screens/OtpScreen';
import HomeScreen from './screens/HomeScreen';

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center font-technical-mono text-on-surface-variant text-technical-mono uppercase tracking-widest">
    Initializing…
  </div>
);

/** Only accessible when NOT signed in. Redirects signed-in users appropriately. */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, otpVerified, loading } = useAuth();
  if (loading) return <Loader />;
  if (user && otpVerified) return <Navigate to="/home" replace />;
  if (user && !otpVerified) return <Navigate to="/verify" replace />;
  return <>{children}</>;
}

/** Requires Firebase auth but NOT yet OTP-verified (the verify step itself). */
function OtpRoute({ children }: { children: React.ReactNode }) {
  const { user, otpVerified, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (otpVerified) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

/** Fully protected — requires Firebase auth AND OTP verification. */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, otpVerified, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!otpVerified) return <Navigate to="/verify" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"  element={<PublicRoute><SignInScreen /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignUpScreen /></PublicRoute>} />
          <Route path="/verify" element={<OtpRoute><OtpScreen /></OtpRoute>} />
          <Route path="/home"   element={<PrivateRoute><HomeScreen /></PrivateRoute>} />
          <Route path="*"       element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

