import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import CrystalPedestal from './CrystalPedestal';
import { useApp } from '../context/AppContext';

export default function AuthPage({ onAuthSuccess }) {
  const { showToast, isRecoveryMode, setIsRecoveryMode, fetchUserData } = useApp();
  const location = useLocation();
  const [role, setRole] = useState('participant'); // 'participant' | 'organiser'
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'reset-password'
  
  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Registration dynamic states (participant only)
  const [skills, setSkills] = useState('');
  const [university, setUniversity] = useState('');
  const [year, setYear] = useState('1st Year');

  const [loading, setLoading] = useState(false);

  // Removed the force-tab to 'login' since organisers can register now.

  useEffect(() => {
    // Detect if we are in password recovery flow
    if (location.hash.includes('type=recovery') || 
        location.pathname.includes('recovery') || 
        location.search.includes('type=recovery') ||
        isRecoveryMode) {
      setTab('reset-password');
      showToast('Please set your new account password below.', 'info');
    }
  }, [location, isRecoveryMode]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all email and password fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        console.error('Auth login error:', authError);
        throw authError;
      }
      
      // Fetch profile role from database for role validation
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Profile role lookup error:', profileError);
      }

      const userRole = profile?.role || 'participant';

      // Role validation: enforce that selected role matches actual profile role
      if (role === 'organiser' && userRole !== 'organiser') {
        showToast('You are not authorized as an organiser.', 'error');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (role === 'participant' && userRole !== 'participant') {
        showToast('Please login using the organiser portal.', 'error');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      showToast('Welcome back to HackTech! 🚀', 'success');
      onAuthSuccess(data.user, userRole);
    } catch (err) {
      showToast(err.message || 'Login failed. Please verify credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    // Removed the block on admin registration since this is now organiser and it IS public.

    if (!name || !email || !password) {
      showToast('Please fill in all registration fields.', 'error');
      return;
    }
    if (role === 'participant' && (!skills || !university || !year)) {
      showToast('Please fill in all participant info (skills, university, year).', 'error');
      return;
    }
    if (role === 'organiser' && (!skills || !university)) { // Using skills for OrgRole and university for OrgName temporarily, or we need new states
      showToast('Please provide your Organization Name and Role.', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        console.error('Auth signUp error:', signUpError);
        throw signUpError;
      }

      if (data && data.user) {
        // Save core profile to the profiles table (only columns that exist in the schema)
        const insertPayload = {
          id: data.user.id,
          full_name: name,
          email,
          role: role, // 'participant' or 'organiser'
        };

        console.log('Upserting profile with payload:', insertPayload);
        const { error: dbError } = await supabase.from('profiles').upsert([insertPayload]);
        if (dbError) {
          console.error('Profile upsert error:', dbError);
          throw dbError;
        }

        // Store in localStorage ht_users_extra to sync matching profiles
        const extra = JSON.parse(localStorage.getItem('ht_users_extra')) || {};
        if (role === 'participant') {
          extra[data.user.id] = {
            skills: skills.trim(),
            location: '',
            interests: '',
            university: university.trim(),
            year,
            organization: ''
          };
        } else {
          extra[data.user.id] = {
            organization: university.trim(), // Repurposing state for ease
            orgRole: skills.trim(), // Repurposing state for ease
            skills: '',
            location: '',
            interests: '',
            university: '',
            year: ''
          };
        }
        localStorage.setItem('ht_users_extra', JSON.stringify(extra));

        // Fetch updated profile data directly into AppContext to avoid routing race conditions
        await fetchUserData(data.user.id, email);

        showToast(`Registration complete! Welcome, ${name}! 🎉`, 'success');
        onAuthSuccess(data.user, role);
      }
    } catch (err) {
      showToast(err.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Please type your email address in the Email field first.', 'warning');
      return;
    }

    setLoading(true);
    try {
      // If role === 'admin', verify they are actually an admin in the users table first!
      if (role === 'admin') {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', email)
          .single();

        if (profileError) {
          console.error('Admin profile lookup error:', profileError);
        }
        if (profileError || !data || data.role !== 'admin') {
          showToast('This email is not registered as an administrator.', 'error');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      });
      if (error) throw error;
      showToast('Password reset link sent successfully! Check your inbox.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to dispatch reset link.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      showToast('Please type your new password.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('Your password has been successfully updated! Redirecting to dashboard... 🚀', 'success');
      // Clean up hash/URL
      if (window.history.replaceState) {
        window.history.replaceState(null, null, window.location.pathname);
      }
      setIsRecoveryMode(false);
      setTab('login');
      setNewPassword('');
    } catch (err) {
      showToast(err.message || 'Failed to update your password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Determine if we should show the Register tab
  const showRegisterTab = true;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-transparent text-slate-100 w-full">
      {/* Local dynamic patterns */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:56px_56px] opacity-80" />
      </div>

      <div className="relative z-10 w-full max-w-[1050px] grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 items-center bg-slate-900/30 backdrop-blur-[16px] p-6 sm:p-8 md:p-12 lg:p-14 rounded-[20px] sm:rounded-[28px] border border-slate-800/60 shadow-2xl">
        {/* Left Column: Branding and 3D crystal Pedestal */}
        <div className="md:col-span-6 flex flex-col justify-center select-none">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <span className="font-outfit font-extrabold text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">HackTech</span>
          </div>
          <h1 className="font-outfit font-black text-3xl sm:text-4xl lg:text-5xl leading-tight text-slate-100 mb-4 sm:mb-5">
            Build. Secure.<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Innovate.</span>
          </h1>
          <p className="text-slate-350 text-sm sm:text-[15.5px] lg:text-[16.5px] leading-relaxed mb-6 sm:mb-8 max-w-[440px]">
            Discover, collaborate, and create the next generation of tech events. HackTech connects developers, innovators, and creators around the globe.
          </p>
          <div className="w-full h-[160px] sm:h-[200px] lg:h-[220px] flex items-center justify-center overflow-hidden">
            <CrystalPedestal />
          </div>
        </div>

        {/* Right Column: Auth Card */}
        <div className="md:col-span-6 bg-slate-900/65 border border-slate-800/80 p-5 sm:p-8 md:p-10 rounded-[20px] sm:rounded-[24px] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-primary to-accent" />
          
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <button 
              type="button"
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-xl border text-xs sm:text-[14px] font-semibold tracking-wide transition-all ${role === 'participant' ? 'bg-primary/10 border-primary text-primary shadow-md shadow-primary/5' : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              onClick={() => setRole('participant')}
            >
              <span>🧑‍💻</span> Participant
            </button>
            <button 
              type="button"
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-xl border text-xs sm:text-[14px] font-semibold tracking-wide transition-all ${role === 'organiser' ? 'bg-primary/10 border-primary text-primary shadow-md shadow-primary/5' : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              onClick={() => setRole('organiser')}
            >
              <span>🛡️</span> Organiser
            </button>
          </div>

          {/* Form tab selector */}
          {tab !== 'reset-password' ? (
            <div className="flex border-b border-slate-800/60 mb-6 sm:mb-8">
              <button 
                type="button"
                className={`flex-1 pb-3 sm:pb-4 text-sm sm:text-[15px] font-bold border-b-2 transition-all ${tab === 'login' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                onClick={() => setTab('login')}
              >
                Sign In
              </button>
              {showRegisterTab ? (
                <button 
                  type="button"
                  className={`flex-1 pb-3 sm:pb-4 text-sm sm:text-[15px] font-bold border-b-2 transition-all ${tab === 'register' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                  onClick={() => setTab('register')}
                >
                  Register
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex border-b border-slate-800/60 mb-6 sm:mb-8">
              <div className="flex-1 pb-3 sm:pb-4 text-sm sm:text-[15px] font-bold border-b-2 border-primary text-primary text-center">
                🛡️ Secure Password Recovery
              </div>
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="login-email">Email Address</label>
                <input 
                  className="w-full bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-xl text-xs sm:text-[14.5px] text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all relative z-20 pointer-events-auto" 
                  type="email" 
                  id="login-email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required 
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="login-password">Password</label>
                  <a 
                    href="#" 
                    onClick={handleForgotPassword}
                    className="text-[11px] sm:text-[13px] text-primary font-semibold hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <input 
                  className="w-full bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-xl text-xs sm:text-[14.5px] text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all relative z-20 pointer-events-auto" 
                  type="password" 
                  id="login-password" 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required 
                />
              </div>
              <button 
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 hover:-translate-y-0.5 active:translate-y-0 text-white font-bold text-sm sm:text-base py-3 sm:py-4 px-5 sm:px-6 rounded-xl shadow-lg shadow-primary/10 transition-all mt-6 sm:mt-8 flex items-center justify-center disabled:opacity-50" 
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Signing in...' : (role === 'organiser' ? '🛡️ Organiser Sign In' : 'Sign In')}</span>
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="reg-name">Full Name</label>
                <input 
                  className="w-full bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-xl text-xs sm:text-[14.5px] text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" 
                  type="text" 
                  id="reg-name" 
                  placeholder="Your full name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="reg-email">Email Address</label>
                <input 
                  className="w-full bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-xl text-xs sm:text-[14.5px] text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all relative z-20 pointer-events-auto" 
                  type="email" 
                  id="reg-email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required 
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="reg-password">Password</label>
                <input 
                  className="w-full bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-xl text-xs sm:text-[14.5px] text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all relative z-20 pointer-events-auto" 
                  type="password" 
                  id="reg-password" 
                  placeholder="Min 6 characters" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required 
                />
              </div>

              {role === 'participant' ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="reg-univ">University Name</label>
                      <input 
                        className="w-full bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-xl text-xs sm:text-[13.5px] text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" 
                        type="text" 
                        id="reg-univ" 
                        placeholder="e.g. Stanford University" 
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="reg-year">Year of Study</label>
                      <select 
                        className="w-full bg-slate-950/60 border border-slate-800/80 px-4 py-3.5 rounded-xl text-xs sm:text-[13.5px] text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-semibold" 
                        id="reg-year" 
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        required 
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="Graduate">Graduate</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="reg-skills">Technical Skills (comma-separated)</label>
                    <input 
                      className="w-full bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-xl text-xs sm:text-[14.5px] text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" 
                      type="text" 
                      id="reg-skills" 
                      placeholder="e.g. React, Python, Cyber Security" 
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      required 
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="reg-org">Organization / Company Name</label>
                    <input 
                      className="w-full bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-xl text-xs sm:text-[14.5px] text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" 
                      type="text" 
                      id="reg-org" 
                      placeholder="e.g. Google, GDG Chapter, MLH" 
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="reg-orgRole">Your Role</label>
                    <input 
                      className="w-full bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-xl text-xs sm:text-[14.5px] text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" 
                      type="text" 
                      id="reg-orgRole" 
                      placeholder="e.g. Lead Coordinator, Developer Advocate" 
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      required 
                    />
                  </div>
                </>
              )}

              <button 
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 hover:-translate-y-0.5 active:translate-y-0 text-white font-bold text-sm sm:text-base py-3 sm:py-4 px-5 sm:px-6 rounded-xl shadow-lg shadow-primary/10 transition-all mt-6 sm:mt-8 flex items-center justify-center disabled:opacity-50" 
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              </button>
            </form>
          )}

          {tab === 'reset-password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4 sm:space-y-5">
              <div className="flex flex-col gap-1.5 text-center mb-4">
                <span className="text-2xl">🔒</span>
                <h3 className="font-outfit font-black text-lg text-slate-100">Set New Password</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter a secure new password for your {role === 'admin' ? 'administrator' : 'developer'} account.
                </p>
              </div>
              
              <div>
                <label className="block text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="reset-new-password">New Password</label>
                <input 
                  className="w-full bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-xl text-xs sm:text-[14.5px] text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all relative z-20 pointer-events-auto" 
                  type="password" 
                  id="reset-new-password" 
                  placeholder="Enter at least 6 characters" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required 
                />
              </div>
              
              <button 
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 hover:-translate-y-0.5 active:translate-y-0 text-white font-bold text-sm sm:text-base py-3 sm:py-4 px-5 sm:px-6 rounded-xl shadow-lg shadow-primary/10 transition-all mt-6 sm:mt-8 flex items-center justify-center disabled:opacity-50" 
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
              </button>

              <div className="text-center mt-4">
                <button 
                  type="button"
                  onClick={() => setTab('login')}
                  className="text-[11px] sm:text-[13px] text-slate-400 hover:text-slate-200 underline font-semibold"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
