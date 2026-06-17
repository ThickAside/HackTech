import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';

const AppContext = createContext(null);

export function AppContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ht_theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Sync theme attribute on document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ht_theme', theme);
  }, [theme]);

  // Toast Notification trigger
  const showToast = (message, type = 'info', title = null) => {
    const id = Math.random().toString(36).slice(2, 9);
    const defaultTitle = { success: 'Success', error: 'Error', info: 'Info', warning: 'Warning' }[type];
    const newToast = { id, message, type, title: title || defaultTitle };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const fetchUserData = async (userId, userEmail) => {
    try {
      // Check if user is banned
      const bannedUsersList = JSON.parse(localStorage.getItem('ht_banned_users')) || [];
      if (bannedUsersList.includes(userId)) {
        showToast('Your account has been suspended by an administrator.', 'error');
        await supabase.auth.signOut();
        setUser(null);
        setUserData(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
      }

      if (data) {
        // Map full_name -> name for backward compatibility across all components
        const normalizedData = { ...data, name: data.full_name || data.name || '' };
        const extra = JSON.parse(localStorage.getItem('ht_users_extra')) || {};
        const userExtra = extra[userId] || {};
        setUserData({ uid: userId, ...normalizedData, ...userExtra });
      } else {
        setUserData({ uid: userId, email: userEmail, role: 'participant', name: '' });
      }
    } catch (err) {
      console.error('Could not load profile:', err.message);
      setUserData({ uid: userId, email: userEmail, role: 'participant', name: '' });
    }
  };

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      console.log("[Auth] Checking initial session...");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          if (active) {
            setUser(session.user);
            await fetchUserData(session.user.id, session.user.email);
          }
        } else {
          if (active) {
            setUser(null);
            setUserData(null);
          }
        }
      } catch (err) {
        console.error("[Auth] Initial session check error:", err);
      } finally {
        if (active) {
          console.log("[Auth] Initial session check complete, setting authLoading to false");
          setAuthLoading(false);
        }
      }
    };

    initializeAuth();

    console.log("[Auth] Registering onAuthStateChange listener...");
    
    // Listen for auth changes (this handles both the initial load session and subsequent changes in Supabase v2)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Auth state changed: ${event}`, !!session);
      try {
        if (event === 'PASSWORD_RECOVERY') {
          if (active) {
            setIsRecoveryMode(true);
          }
        }
        if (session && session.user) {
          if (active) {
            setUser(session.user);
            await fetchUserData(session.user.id, session.user.email);
          }
        } else {
          if (active) {
            setUser(null);
            setUserData(null);
          }
        }
      } catch (err) {
        console.error("[Auth] Error in onAuthStateChange callback:", err);
      } finally {
        if (active) {
          console.log("[Auth] Setting authLoading to false");
          setAuthLoading(false);
        }
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setUser(null);
    setUserData(null);
    setIsRecoveryMode(false);
    localStorage.clear();
    
    try {
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 800));
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (err) {
      console.warn("SignOut error:", err);
    }
    
    window.location.href = '/login';
  };

  const contextValue = useMemo(() => ({
    user,
    userData,
    authLoading,
    toasts,
    theme,
    setTheme,
    showToast,
    handleLogout,
    isRecoveryMode,
    setIsRecoveryMode,
    fetchUserData: (uid, email) => fetchUserData(uid, email)
  }), [user, userData, authLoading, toasts, theme, isRecoveryMode]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppContextProvider');
  }
  return context;
}
