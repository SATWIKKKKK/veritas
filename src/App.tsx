/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PhoneScreen from './screens/PhoneScreen';
import OtpScreen from './screens/OtpScreen';
import HomeScreen from './screens/HomeScreen';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { authToken, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center font-technical-mono">Initializing Protocol...</div>;
  
  return authToken ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { authToken, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center font-technical-mono">Initializing Protocol...</div>;
  
  return !authToken ? <>{children}</> : <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><PhoneScreen /></PublicRoute>} />
          <Route path="/verify" element={<PublicRoute><OtpScreen /></PublicRoute>} />
          <Route path="/home" element={<PrivateRoute><HomeScreen /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
