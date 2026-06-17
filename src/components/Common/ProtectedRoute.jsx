import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, userData, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center bg-slate-950">
        <div className="spinner border-4 border-slate-800 border-t-primary w-12 h-12 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user && !userData) {
    return (
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center bg-slate-950">
        <div className="spinner border-4 border-slate-800 border-t-primary w-12 h-12 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (allowedRole && userData && userData.role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
