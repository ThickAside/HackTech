import React, { useState } from 'react';
import { Shield, ShieldAlert, Search, Trash2, Mail, Calendar, UserCheck } from 'lucide-react';

export default function Organisers({ users, showToast, handleToggleRole, handleDeleteUser, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');

  const organiserUsers = users.filter(u => u.role === 'organiser');

  const filteredOrganisers = organiserUsers.filter(u => {
    const query = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query))
    );
  });

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isSelf = (adminId, adminEmail) => {
    if (!currentUser) return false;
    return currentUser.id === adminId || currentUser.uid === adminId || currentUser.email === adminEmail;
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Total Organisers</span>
            <span className="font-outfit font-black text-3xl text-slate-100 block mt-1.5">{organiserUsers.length}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Shield size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">System Authority Status</span>
            <span className="font-outfit font-bold text-sm text-emerald-400 block mt-2">● Active & Secure</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <UserCheck size={24} />
          </div>
        </div>
      </div>

      {/* Search Input Panel */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input
          type="text"
          placeholder="Search organiser registry by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-800/80 rounded-xl py-2.5 sm:py-3 pl-11 pr-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/45 transition-colors shadow-sm"
        />
      </div>

      {/* Organiser Cards Grid */}
      {filteredOrganisers.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-12 text-center text-slate-400">
          <Shield size={48} className="mx-auto text-slate-700 mb-4 opacity-50" />
          <p className="text-sm font-semibold">No organisers found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrganisers.map(admin => {
            const initials = admin.name
              ? admin.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
              : admin.email.split('@')[0].substring(0, 2).toUpperCase();

            const isCurrent = isSelf(admin.id, admin.email);

            return (
              <div
                key={admin.id}
                className="bg-slate-900/35 border border-slate-800/60 rounded-2xl p-5 hover:border-amber-500/20 transition-all flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-amber-500 font-outfit font-black text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-sm sm:text-base truncate" title={admin.name || ''}>
                        {admin.name || 'Organiser Officer'}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 truncate">
                      <Mail size={12} className="text-slate-500" />
                      {admin.email}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-2">
                      <Calendar size={12} className="text-slate-500" />
                      Appointed on {formatDate(admin.created_at || admin.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800/50 pt-3 flex justify-between items-center text-xs">
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                    Full Authority
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRole(admin)}
                      disabled={isCurrent}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
                        isCurrent
                          ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                          : 'border-slate-800 text-slate-400 hover:text-amber-500 hover:border-amber-500/30 hover:bg-amber-500/5'
                      }`}
                      title={isCurrent ? "You cannot demote yourself" : "Revoke Organiser Privilege"}
                    >
                      <Shield size={12} />
                      Revoke
                    </button>
                    
                    <button
                      onClick={() => handleDeleteUser(admin.id)}
                      disabled={isCurrent}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isCurrent
                          ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                          : 'border-slate-800 text-slate-500 hover:text-danger hover:border-danger/30 hover:bg-danger/5'
                      }`}
                      title={isCurrent ? "You cannot delete your own profile" : "Delete Organiser Profile"}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
