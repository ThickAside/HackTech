import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, Users, Shield, LogOut, BarChart2 
} from 'lucide-react';

export default function SysAdminLayout() {
  const { userData, handleLogout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/sysadmin/dashboard', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { path: '/sysadmin/dashboard/users', label: 'User Registry & Moderation', icon: <Users size={16} /> },
    { path: '/sysadmin/dashboard/reports', label: 'Tickets & Reports', icon: <BarChart2 size={16} /> }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-[260px] bg-slate-950/80 border-b md:border-b-0 md:border-r border-slate-900 flex flex-col py-6 px-4 shrink-0 z-[100]">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <Shield size={24} className="text-danger" />
          <span className="font-outfit font-black text-xl text-slate-100">SysAdmin</span>
        </div>

        <nav className="flex-1 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar pb-4 md:pb-0">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-[13px] tracking-wide shrink-0 whitespace-nowrap ${
                  isActive 
                    ? 'bg-danger/10 text-danger shadow-sm shadow-danger/5 border border-danger/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <div className={`${isActive ? 'opacity-100' : 'opacity-60'} transition-opacity`}>
                  {item.icon}
                </div>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Profile Summary */}
        <div className="hidden md:block mt-auto border-t border-slate-900/60 pt-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center font-outfit font-black text-danger text-sm">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-200 text-sm truncate">Administrator</div>
              <div className="text-[10px] text-slate-500 truncate">{userData?.email || 'admin@hacktech.com'}</div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-slate-500 hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-all border border-slate-800"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto relative bg-slate-950">
        <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
