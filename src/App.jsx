import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppContextProvider, useApp } from './context/AppContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import Unauthorized from './components/Common/Unauthorized';

import AuthPage from './components/AuthPage';
import Dashboard from './components/Participant/Dashboard';
import EventsPage from './components/Participant/EventsPage';
import TeamsPage from './components/Participant/TeamsPage';
import BlogPage from './components/Participant/BlogPage';
import ProfilePage from './components/Participant/ProfilePage';
import EventChannelPage from './components/Participant/EventChannelPage';

import OrganiserConsole from './components/Organiser/OrganiserConsole';
import ParticipantLayout from './components/Participant/ParticipantLayout';
import OrganiserLayout from './components/Organiser/OrganiserLayout';

import SysAdminLogin from './components/Admin/SysAdminLogin';
import SysAdminConsole from './components/Admin/SysAdminConsole';
import SysAdminLayout from './components/Admin/SysAdminLayout';
import LiveBackground from './components/Common/LiveBackground';

const TOAST_ICONS = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

function AppContent() {
  const { user, userData, authLoading, toasts, theme, isRecoveryMode } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Automatic redirect upon successful login / session hydration
  useEffect(() => {
    const isUrlRecovery = location.hash.includes('type=recovery') || 
                         location.pathname.includes('recovery') || 
                         location.search.includes('type=recovery');

    if (!authLoading && user && userData && !isRecoveryMode && !isUrlRecovery) {
      if (location.pathname === '/login' || location.pathname === '/') {
        if (userData.role === 'admin') {
          navigate('/sysadmin/dashboard', { replace: true });
        } else if (userData.role === 'organiser') {
          navigate('/dashboard/organiser', { replace: true });
        } else {
          navigate('/dashboard/participant', { replace: true });
        }
      }
    }
  }, [user, userData, authLoading, location.pathname, navigate, isRecoveryMode, location.hash, location.search]);

  // (LiveBackground component now handles the interactive canvas)

  if (authLoading) {
    return (
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center bg-slate-950">
        <div className="spinner border-4 border-slate-800 border-t-primary w-12 h-12 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-primary/30 overflow-x-hidden flex flex-col justify-between">
      {/* Live interactive background — theme-aware with cursor reactivity */}
      <LiveBackground />

      {/* Toast Container */}
      <div id="toast-container" className="fixed top-6 right-6 z-[99999] flex flex-col gap-2 max-w-sm pointer-events-none" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type} pointer-events-auto`}>
            <span className="toast-icon text-xl shrink-0">{TOAST_ICONS[t.type]}</span>
            <div className="toast-content flex-1">
              <div className="toast-title font-outfit font-bold text-sm">{t.title}</div>
              {t.message && <div className="toast-msg text-xs text-slate-400 mt-0.5">{t.message}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Router Routing Tree */}
      <Routes>
        <Route path="/" element={<Navigate to={{ pathname: "/login", hash: window.location.hash, search: window.location.search }} replace />} />
        <Route path="/login" element={<AuthPage onAuthSuccess={(u, role) => {
          if (role === 'admin') navigate('/sysadmin/dashboard', { replace: true });
          else if (role === 'organiser') navigate('/dashboard/organiser', { replace: true });
          else navigate('/dashboard/participant', { replace: true });
        }} />} />
        
        {/* Hidden SysAdmin Login */}
        <Route path="/sysadmin" element={<SysAdminLogin onAuthSuccess={() => {
          navigate('/sysadmin/dashboard', { replace: true });
        }} />} />

        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Participant Space Protected Routes */}
        <Route path="/dashboard/participant" element={
          <ProtectedRoute allowedRole="participant">
            <ParticipantLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="channels" element={<EventChannelPage />} />
        </Route>

        {/* Organizer Space Protected Routes */}
        <Route path="/dashboard/organiser" element={
          <ProtectedRoute allowedRole="organiser">
            <OrganiserLayout />
          </ProtectedRoute>
        }>
          <Route index element={<OrganiserConsole activeTab="org-dashboard" />} />
          <Route path="events" element={<OrganiserConsole activeTab="org-events" />} />
          <Route path="registrations" element={<OrganiserConsole activeTab="org-registrations" />} />
          <Route path="participants" element={<OrganiserConsole activeTab="org-participants" />} />
          <Route path="teams" element={<OrganiserConsole activeTab="org-teams" />} />
          <Route path="announcements" element={<OrganiserConsole activeTab="org-announcements" />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<OrganiserConsole activeTab="org-settings" />} />
        </Route>

        {/* SysAdmin Space Protected Routes */}
        <Route path="/sysadmin/dashboard" element={
          <ProtectedRoute allowedRole="admin">
            <SysAdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<SysAdminConsole activeTab="sys-dashboard" />} />
          <Route path="users" element={<SysAdminConsole activeTab="sys-users" />} />
          <Route path="reports" element={<SysAdminConsole activeTab="sys-reports" />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContextProvider>
        <AppContent />
      </AppContextProvider>
    </BrowserRouter>
  );
}
