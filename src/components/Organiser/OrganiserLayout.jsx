import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, Calendar, Users, FileText, Megaphone, 
  Settings, Sun, Moon, LogOut, Shield, UserCheck,
  ChevronLeft, ChevronRight
} from 'lucide-react';

export default function OrganiserLayout() {
  const { userData, theme, setTheme, handleLogout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('ht_sidebar_o_collapsed') === 'true'; } catch { return false; }
  });
  const location = useLocation();

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('ht_sidebar_o_collapsed', String(next)); } catch {}
  };

  const displayName = userData?.name || userData?.email?.split('@')[0] || 'Chief Organiser';
  const initials = displayName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const navItems = [
    { path: '/dashboard/organiser', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { path: '/dashboard/organiser/events', label: 'Events Catalog', icon: <Calendar size={18} /> },
    { path: '/dashboard/organiser/registrations', label: 'Registrations', icon: <Users size={18} /> },
    { path: '/dashboard/organiser/participants', label: 'Roster Registry', icon: <Shield size={18} /> },
    { path: '/dashboard/organiser/teams', label: 'Teams Approvals', icon: <Users size={18} /> },
    { path: '/dashboard/organiser/announcements', label: 'Announcements', icon: <Megaphone size={18} /> },
    { path: '/dashboard/organiser/profile', label: 'My Profile', icon: <UserCheck size={18} /> },
    { path: '/dashboard/organiser/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const sidebarW = collapsed ? '72px' : '240px';
  const mainML = collapsed ? '72px' : '240px';

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden">

      {/* Navigation Sidebar */}
      <aside
        id="sidebar"
        style={{ width: sidebarW }}
        className={`fixed top-0 left-0 h-screen bg-slate-950/90 border-r border-slate-900/60 backdrop-blur-lg flex flex-col py-6 z-[100] transition-all duration-300 ease-in-out max-[1024px]:w-[240px] max-[1024px]:-translate-x-full ${mobileOpen ? 'max-[1024px]:translate-x-0 max-[1024px]:shadow-2xl' : ''}`}
        aria-label="Organiser Navigation"
      >
        {/* Logo + Collapse toggle */}
        <div className="flex items-center px-4 mb-8 select-none gap-2 overflow-hidden">
          {!collapsed && (
            <span className="font-outfit font-black text-lg bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent whitespace-nowrap leading-tight">
              HackTech<br /><span className="text-sm font-semibold text-slate-400">Organiser</span>
            </span>
          )}
          <button
            onClick={toggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`${collapsed ? 'mx-auto' : 'ml-auto'} shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-900 transition-all max-[1024px]:hidden`}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-1">
          {!collapsed && (
            <div className="text-[11px] font-bold text-slate-500 tracking-widest uppercase px-5 mb-2">Management</div>
          )}

          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 py-3 cursor-pointer text-[15px] font-semibold border-l-[3px] border-transparent transition-all hover:bg-slate-900/50 hover:text-slate-100
                  ${collapsed ? 'px-0 justify-center border-l-0' : 'px-5'}
                  ${active ? 'text-amber-400 bg-amber-500/8 border-amber-400 font-bold' : 'text-slate-400'}`}
              >
                <span className={`shrink-0 ${active ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'} transition-colors`}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {/* Tooltip when collapsed */}
                {collapsed && (
                  <span className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme switch & user status */}
        <div className={`mt-auto pt-4 border-t border-slate-900/60 flex flex-col gap-3.5 shrink-0 ${collapsed ? 'px-0 items-center' : 'px-5'}`}>
          {/* Theme toggle */}
          {collapsed ? (
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition-all"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          ) : (
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="flex items-center justify-between w-full bg-slate-900/35 hover:bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-450 hover:text-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
              </span>
              <span className="text-[9px] font-mono tracking-wider bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-500 uppercase">{theme}</span>
            </button>
          )}

          {/* User card */}
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-outfit font-bold text-sm shrink-0" title={displayName}>
                {initials}
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="text-slate-500 p-1.5 rounded-lg hover:text-red-400 hover:bg-slate-900 transition-all cursor-pointer"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-900/40 cursor-pointer group transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-outfit font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-200 text-sm truncate">{displayName}</div>
                <div className="text-[10px] text-slate-400 capitalize font-medium">Organiser</div>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-500 text-base p-1.5 rounded-lg hover:text-red-400 hover:bg-slate-900 transition-all shrink-0 cursor-pointer"
                title="Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Hamburger menu trigger (mobile) */}
      <button
        onClick={() => setMobileOpen(prev => !prev)}
        className="fixed top-4 left-4 z-[999] hidden max-[1024px]:flex w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl items-center justify-center text-slate-200 shadow-md cursor-pointer"
        aria-label="Toggle menu"
      >
        ☰
      </button>
      <div
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[90] hidden ${mobileOpen ? 'max-[1024px]:block' : ''}`}
      />

      {/* Primary content area */}
      <main
        id="content"
        style={{ marginLeft: mainML }}
        className="flex-1 min-h-screen p-6 xl:p-10 overflow-y-auto max-[1024px]:ml-0 max-[1024px]:p-4 sm:p-5 max-[1024px]:pt-[80px] relative z-10 transition-all duration-300"
      >
        <Outlet />
      </main>
    </div>
  );
}
