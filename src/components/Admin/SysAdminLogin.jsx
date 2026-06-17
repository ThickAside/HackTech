import React, { useState } from 'react';
import { supabase } from '../../supabase';
import { useApp } from '../../context/AppContext';
import { Shield } from 'lucide-react';

export default function SysAdminLogin({ onAuthSuccess }) {
  const { showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all email and password fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      const userRole = profile?.role || 'participant';

      if (userRole !== 'admin') {
        showToast('You are not authorized as a system administrator.', 'error');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      showToast('System Administrator Authentication Successful.', 'success');
      onAuthSuccess(data.user);
    } catch (err) {
      showToast(err.message || 'Login failed. Please verify credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-danger/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger mb-4">
            <Shield size={32} />
          </div>
          <h1 className="font-outfit font-black text-2xl text-slate-100 tracking-tight text-center">System Admin Portal</h1>
          <p className="text-slate-500 text-sm mt-2 text-center">Restricted Access. Authorized personnel only.</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="admin-email">Email Address</label>
            <input 
              className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-danger focus:ring-2 focus:ring-danger/20 transition-all" 
              type="email" 
              id="admin-email" 
              placeholder="admin@hacktech.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="admin-password">Password</label>
            <input 
              className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-danger focus:ring-2 focus:ring-danger/20 transition-all" 
              type="password" 
              id="admin-password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            className="w-full bg-danger hover:bg-danger/90 text-white font-bold text-sm py-3.5 px-6 rounded-xl shadow-lg shadow-danger/20 transition-all mt-4 disabled:opacity-50 flex items-center justify-center gap-2" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (
              <>
                <Shield size={16} /> Admin Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
