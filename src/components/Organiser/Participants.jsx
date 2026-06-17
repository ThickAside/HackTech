import React, { useState } from 'react';
import { Users, Search, Download, Shield, Trash2, Mail, MapPin, Code2, Award, Calendar, Send } from 'lucide-react';

export default function Participants({ 
  users, 
  showToast, 
  handleToggleRole, 
  handleDeleteUser, 
  handleExportCSV, 
  onBroadcastOpen 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForMessage, setSelectedUserForMessage] = useState(null);
  const [messageText, setMessageText] = useState('');

  const participants = users.filter(u => u.role === 'participant');

  // Load Extra Metadata Fallbacks
  let usersExtraMap = {};
  try {
    usersExtraMap = JSON.parse(localStorage.getItem('ht_users_extra')) || {};
  } catch {
    usersExtraMap = {};
  }

  const filteredParticipants = participants.filter(u => {
    const query = searchQuery.toLowerCase();
    const extra = usersExtraMap[u.id] || { skills: '', location: '' };
    return (
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (extra.skills && extra.skills.toLowerCase().includes(query)) ||
      (extra.location && extra.location.toLowerCase().includes(query))
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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    // Simulate sending a customized message to the participant
    showToast(`Successfully dispatched direct event communication to ${selectedUserForMessage.name || selectedUserForMessage.email}!`, 'success');
    
    // Also save this message to local alerts so it shows up in dashboard logs or message tab
    const pastMessages = JSON.parse(localStorage.getItem('ht_messages_log')) || [];
    pastMessages.push({
      id: Math.random().toString(36).slice(2, 9),
      recipientId: selectedUserForMessage.id,
      recipientName: selectedUserForMessage.name || selectedUserForMessage.email,
      text: messageText,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('ht_messages_log', JSON.stringify(pastMessages));

    setMessageText('');
    setSelectedUserForMessage(null);
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/35 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Participants Roster</span>
            <span className="font-outfit font-black text-3xl text-slate-100 block mt-1">{participants.length}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-slate-900/35 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Global Tech Skills</span>
            <span className="font-outfit font-black text-base text-slate-200 block mt-2.5">AI, Fullstack, Web3</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Code2 size={20} />
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-850 hover:border-slate-750 p-5 rounded-2xl flex items-center justify-between transition-all text-left"
        >
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Data Registry</span>
            <span className="font-outfit font-black text-sm text-slate-200 block mt-2">Export CSV catalog</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
            <Download size={20} />
          </div>
        </button>
      </div>

      {/* Search Input Panel */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input
          type="text"
          placeholder="Filter developers by name, email, skills tags or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-800/80 rounded-xl py-2.5 pl-11 pr-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/45 transition-colors shadow-sm"
        />
      </div>

      {/* Participants Table Container */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
        {filteredParticipants.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Users className="mx-auto mb-3 text-slate-600" size={36} />
            <p className="text-sm font-semibold">No participants found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800/80 text-slate-450 uppercase font-bold tracking-wider text-[10px] sm:text-[11px]">
                  <th className="py-4 px-5">Developer Details</th>
                  <th className="py-4 px-5">Location</th>
                  <th className="py-4 px-5">Skills</th>
                  <th className="py-4 px-5">Events Joined</th>
                  <th className="py-4 px-5">Join Date</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredParticipants.map(user => {
                  const extra = usersExtraMap[user.id] || { skills: '', location: '' };
                  const initials = user.name
                    ? user.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
                    : user.email.split('@')[0].substring(0, 2).toUpperCase();

                  const eventsCount = user.joinedEvents?.length || 0;

                  return (
                    <tr key={user.id} className="hover:bg-slate-950/40 transition-colors text-slate-300">
                      {/* Identity Column */}
                      <td className="py-4 px-5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-primary font-outfit font-black text-xs shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-200 text-sm truncate max-w-[150px]">{user.name || 'Developer User'}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[180px]">{user.email}</div>
                        </div>
                      </td>

                      {/* Location Column */}
                      <td className="py-4 px-5 text-slate-350 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-slate-500" />
                          {extra.location || 'Remote'}
                        </span>
                      </td>

                      {/* Skills Column */}
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(extra.skills || 'General Tech').split(',').map((sk, idx) => (
                            <span key={idx} className="text-[9px] bg-slate-950 border border-slate-800/80 text-slate-450 px-1.5 py-0.5 rounded-md font-medium">
                              {sk.trim()}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Events Column */}
                      <td className="py-4 px-5 font-mono text-[11px] font-semibold text-slate-400">
                        {eventsCount} {eventsCount === 1 ? 'event' : 'events'}
                      </td>

                      {/* Join Date Column */}
                      <td className="py-4 px-5 text-slate-500 font-medium text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-650" />
                          {formatDate(user.created_at || user.createdAt)}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setSelectedUserForMessage(user)}
                            className="text-slate-500 hover:text-primary hover:bg-slate-850 p-2 rounded-lg transition-all"
                            title="Direct Message Event Info"
                          >
                            <Send size={13} />
                          </button>
                          <button
                            onClick={() => handleToggleRole(user)}
                            className="text-slate-500 hover:text-amber-500 hover:bg-slate-850 p-2 rounded-lg transition-all"
                            title="Promote to Organiser"
                          >
                            <Shield size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-slate-500 hover:text-danger hover:bg-slate-850 p-2 rounded-lg transition-all"
                            title="Delete Developer Profile"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Messaging Modal */}
      {selectedUserForMessage && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 z-[99999] page-enter">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="font-outfit font-black text-lg text-slate-200 mb-1 flex items-center gap-2">
              <Send size={18} className="text-primary animate-pulse" /> Message Participant
            </h3>
            <p className="text-xs text-slate-450 mb-4">
              Compose customized developer communications (e.g. venue links, details, hackathon updates) for <strong>{selectedUserForMessage.name || selectedUserForMessage.email}</strong>.
            </p>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <textarea
                required
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="e.g. Hi there! Congratulations on registering. The problem statement will be unlocked at 9:00 AM on Hall 4..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary/50 resize-none"
              />

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedUserForMessage(null)}
                  className="px-4 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-xl text-xs font-semibold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  Dispatch Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
