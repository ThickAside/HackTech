import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useApp } from '../../context/AppContext';
import { Shield, ShieldOff, Trash2, Users, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SysAdminConsole({ activeTab }) {
  const { showToast } = useApp();
  const [users, setUsers] = useState([]);
  const [bannedUsers, setBannedUsers] = useState(() => JSON.parse(localStorage.getItem('ht_banned_users')) || []);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const currentTab = activeTab.replace('sys-', '') || 'dashboard';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      showToast('Error fetching users: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = (userId, name) => {
    const isBanned = bannedUsers.includes(userId);
    let nextBanned;
    if (isBanned) {
      nextBanned = bannedUsers.filter(id => id !== userId);
      showToast(`User ${name} has been unbanned.`, 'success');
    } else {
      nextBanned = [...bannedUsers, userId];
      showToast(`User ${name} has been banned.`, 'warning');
    }
    setBannedUsers(nextBanned);
    localStorage.setItem('ht_banned_users', JSON.stringify(nextBanned));
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to completely delete this user's profile? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setUsers(users.filter(u => u.id !== userId));
      showToast('User profile deleted.', 'success');
    } catch (err) {
      showToast('Failed to delete user: ' + err.message, 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    if (u.role === 'admin') return false; // Don't show admins in the moderation list
    const q = searchQuery.toLowerCase();
    return (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  });

  return (
    <div className="page-enter">
      <h1 className="font-outfit font-black text-2xl sm:text-3xl text-slate-100 mb-6 flex items-center gap-3">
        {currentTab === 'dashboard' && 'System Overview'}
        {currentTab === 'users' && 'User Moderation'}
        {currentTab === 'reports' && 'Tickets & Reports'}
      </h1>

      {loading ? (
        <div className="text-center text-slate-500 py-12">Loading system data...</div>
      ) : (
        <>
          {currentTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Users</div>
                <div className="text-4xl font-outfit font-black text-slate-100">{users.length}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Banned Accounts</div>
                <div className="text-4xl font-outfit font-black text-danger">{bannedUsers.length}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Active Reports</div>
                <div className="text-4xl font-outfit font-black text-amber-500">0</div>
              </div>
            </div>
          )}

          {currentTab === 'users' && (
            <div className="space-y-6">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Search participants and organisers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 focus:outline-none focus:border-danger/50"
                />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="py-4 px-6">User</th>
                      <th className="py-4 px-6">Role</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredUsers.map(user => {
                      const isBanned = bannedUsers.includes(user.id);
                      return (
                        <tr key={user.id} className="hover:bg-slate-800/20 text-slate-300">
                          <td className="py-4 px-6">
                            <div className="font-semibold text-slate-200">{user.full_name || 'User'}</div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </td>
                          <td className="py-4 px-6 capitalize">{user.role}</td>
                          <td className="py-4 px-6">
                            {isBanned ? (
                              <span className="text-[10px] bg-danger/10 text-danger border border-danger/20 px-2 py-1 rounded font-bold uppercase">Banned</span>
                            ) : (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded font-bold uppercase">Active</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleToggleBan(user.id, user.full_name)}
                                className={`p-2 rounded-lg border ${isBanned ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' : 'bg-danger/10 border-danger/20 text-danger hover:bg-danger/20'}`}
                                title={isBanned ? "Unban User" : "Ban User"}
                              >
                                {isBanned ? <CheckCircle2 size={16} /> : <ShieldOff size={16} />}
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-danger hover:border-danger/30"
                                title="Delete User"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No users found.</div>
                )}
              </div>
            </div>
          )}

          {currentTab === 'reports' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <AlertCircle className="mx-auto mb-4 opacity-50" size={48} />
              <h3 className="text-lg font-semibold text-slate-300 mb-2">No active reports</h3>
              <p className="text-sm">System is running smoothly. User tickets will appear here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
