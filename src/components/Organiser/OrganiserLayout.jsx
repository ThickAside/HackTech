import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, Calendar, Users, FileText, Megaphone, 
  BarChart2, Settings, Sun, Moon, LogOut, Shield 
} from 'lucide-react';

export default function OrganiserLayout() {
  const { userData, theme, setTheme, handleLogout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const displayName = userData?.name || userData?.email?.split('@')[0] || 'Chief Organiser';
  const initials = displayName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const navItems = [
    { path: '/dashboard/organiser', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { path: '/dashboard/organiser/events', label: 'Events Catalog', icon: <Calendar size={16} /> },
    { path: '/dashboard/organiser/registrations', label: 'Registrations', icon: <Users size={16} /> },
    { path: '/dashboard/organiser/participants', label: 'Roster Registry', icon: <Shield size={16} /> },
    { path: '/dashboard/organiser/teams', label: 'Teams approvals', icon: <Users size={16} /> },
    { path: '/dashboard/organiser/announcements', label: 'Announcements', icon: <Megaphone size={16} /> },
    { path: '/dashboard/organiser/settings', label: 'Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden">

      {/* Navigation Sidebar */}
      <aside 
        id="sidebar" 
        className={`fixed top-0 left-0 w-[240px] xl:w-[260px] h-screen bg-slate-950/80 border-r border-slate-900/60 backdrop-blur-lg flex flex-col py-6 z-[100] transition-transform duration-300 max-[1024px]:-translate-x-full ${mobileOpen ? 'max-[1024px]:translate-x-0 max-[1024px]:shadow-lg' : ''}`}
        aria-label="Organiser Navigation"
      >
        <div className="flex items-center gap-2.5 px-2 py-1 mb-8">
          <span className="font-outfit font-black text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">HackTech Organiser</span>
        </div>

        <nav className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-6">
          <div>
            <div className="text-[11px] font-bold text-slate-500 tracking-widest uppercase px-6 mb-2">Management</div>
            
            {navItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-6 py-3 cursor-pointer text-[15px] font-semibold border-l-[3px] border-transparent transition-all hover:bg-slate-905/50 hover:text-slate-100 ${active ? 'text-primary bg-primary/8 border-primary font-bold' : 'text-slate-400'}`}
                >
                  <span className={active ? 'text-primary' : 'text-slate-400'}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Theme switch & user status */}
        <div className="mt-auto px-6 pt-4 border-t border-slate-900/60 flex flex-col gap-3.5 shrink-0">
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
              className="text-slate-500 text-base p-1.5 rounded-lg hover:text-danger hover:bg-slate-900 transition-all shrink-0 cursor-pointer"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Hamburger menu trigger */}
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
      <main id="content" className="flex-1 ml-[240px] xl:ml-[260px] min-h-screen p-6 xl:p-10 overflow-y-auto max-[1024px]:ml-0 max-[1024px]:p-4 sm:p-5 max-[1024px]:pt-[80px] relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
