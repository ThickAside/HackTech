import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { userData } = useApp();

  const handleGoHome = () => {
    if (!userData) {
      navigate('/login');
      return;
    }
    if (userData.role === 'admin') {
      navigate('/dashboard/admin');
    } else {
      navigate('/dashboard/participant');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-950 text-slate-100 w-full selection:bg-red-500/25">
      {/* Floating Ambient Background Orbs */}
      <div className="fixed top-[20%] left-[20%] w-[350px] h-[350px] rounded-full bg-red-650/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[20%] right-[20%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-red-500/15 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-red-500 to-orange-500" />
        
        <div className="w-16 h-16 rounded-2xl bg-red-550/10 flex items-center justify-center text-red-500 mb-6 border border-red-500/20 shadow-lg shadow-red-500/5 animate-pulse">
          <ShieldAlert size={36} />
        </div>

        <h1 className="font-outfit font-black text-2xl text-slate-100 mb-3 tracking-tight leading-snug">
          Access Restrained
        </h1>
        
        <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-[320px]">
          Your account credentials do not grant authorization keys for this administrative segment.
        </p>

        <button
          onClick={handleGoHome}
          className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-red-500/30 text-slate-200 hover:text-white font-bold font-outfit py-3.5 px-6 rounded-xl transition-all shadow-sm active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    </div>
  );
}
