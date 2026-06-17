import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Plus, Users, ShieldAlert, Award, Copy, LogOut, Trash2, Search, ArrowRight, X, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchEvents as fetchEventsFallback, saveEvent as saveEventFallback, fetchTeams as fetchTeamsFallback, saveTeam as saveTeamFallback, deleteTeam } from '../../utils/supabaseFallback';

export default function TeamsPage() {
  const { userData, showToast } = useApp();
  const [teams, setTeams] = useState([]);
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Action forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Create Team form fields
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [maxSize, setMaxSize] = useState(4);

  // Join Team form fields
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  // Dictionary maps eventId -> event Title
  const [eventMap, setEventMap] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch user's registered events first so they can create teams for them
      const eventsData = await fetchEventsFallback();

      // Filter events user has registered/joined
      const userJoined = (eventsData || []).filter(e => e.participants?.includes(userData.uid));
      setJoinedEvents(userJoined);

      // Create a fast lookup map
      const eMap = {};
      (eventsData || []).forEach(e => {
        eMap[e.id] = e.title;
      });
      setEventMap(eMap);

      // 2. Fetch all teams in the system where user is a member
      const teamsData = await fetchTeamsFallback();

      // Filter teams where user.uid is inside members array
      const userTeams = (teamsData || []).filter(t => t.members?.includes(userData.uid));
      setTeams(userTeams);
    } catch (err) {
      showToast(err.message || 'Failed to sync team rosters.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    if (joinedEvents.length === 0) {
      showToast('You must register for at least one Event before creating a team!', 'warning');
      return;
    }
    setTeamName('');
    setTeamDesc('');
    setSelectedEventId(joinedEvents[0].id);
    // Sync max size with event settings
    setMaxSize(joinedEvents[0].maxTeamSize || 4);
    setShowCreateModal(true);
  };

  const handleEventSelectChange = (eId) => {
    setSelectedEventId(eId);
    const evObj = joinedEvents.find(e => e.id === eId);
    if (evObj) {
      setMaxSize(evObj.maxTeamSize || 4);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName || !selectedEventId) {
      showToast('Please specify a Team Name and Event context.', 'warning');
      return;
    }

    // A user can only be in one team per event!
    const alreadyHasTeamForEvent = teams.some(t => t.eventId === selectedEventId);
    if (alreadyHasTeamForEvent) {
      showToast('You are already registered in a team for this event.', 'warning');
      return;
    }

    setCreating(true);
    // Generate a secure, unique invite code: e.g. HT-XXXX
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const inviteCode = `HT-${randomHex}`;

    const newTeam = {
      name: teamName,
      eventId: selectedEventId,
      description: teamDesc,
      members: [userData.uid],
      leaderId: userData.uid,
      inviteCode,
      maxSize: parseInt(maxSize)
    };

    try {
      await saveTeamFallback(newTeam, true);
      showToast(`Team "${teamName}" created successfully! Code: ${inviteCode}`, 'success');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to create team.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinTeamByCode = async (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) {
      showToast('Please type a valid invitation code.', 'warning');
      return;
    }

    setJoining(true);
    const code = inviteCodeInput.trim().toUpperCase();

    try {
      // Find team with this invite code locally
      const allTeams = await fetchTeamsFallback();
      const matchedTeams = (allTeams || []).filter(t => t.inviteCode === code);

      if (matchedTeams.length === 0) {
        showToast('Invite code not found. Double check character casing.', 'error');
        setJoining(false);
        return;
      }

      const team = matchedTeams[0];

      // Check if user is already in the team
      if (team.members?.includes(userData.uid)) {
        showToast('You are already a member of this team!', 'info');
        setShowJoinModal(false);
        setInviteCodeInput('');
        setJoining(false);
        return;
      }

      // Check capacity
      if (team.members?.length >= team.maxSize) {
        showToast('This team is already fully packed.', 'warning');
        setJoining(false);
        return;
      }

      // User must also join the event itself! Ensure user is in the event's participants
      const allEvents = await fetchEventsFallback();
      const eventData = allEvents.find(e => e.id === team.eventId);

      if (!eventData) throw new Error('Event not found');

      // Auto-register user for the event if not registered
      if (!eventData.participants?.includes(userData.uid)) {
        const nextEvParts = [...(eventData.participants || []), userData.uid];
        await saveEventFallback({ ...eventData, participants: nextEvParts }, false, team.eventId);
      }

      // Check if user is in any other team for this event
      const userTeamsForEvent = teams.filter(t => t.eventId === team.eventId);
      if (userTeamsForEvent.length > 0) {
        showToast('You are already registered in another team for this event. Leave that team first.', 'warning');
        setJoining(false);
        return;
      }

      // Register inside the team!
      const nextMembers = [...(team.members || []), userData.uid];
      await saveTeamFallback({ ...team, members: nextMembers }, false, team.id);

      showToast(`Welcome to Team "${team.name}"!`, 'success');
      setShowJoinModal(false);
      setInviteCodeInput('');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to join team.', 'error');
    } finally {
      setJoining(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    showToast('Invite code copied to clipboard!', 'success');
  };

  const handleLeaveTeam = async (team) => {
    if (!window.confirm(`Are you sure you want to leave "${team.name}"?`)) return;

    try {
      const nextMembers = team.members.filter(id => id !== userData.uid);
      await saveTeamFallback({ ...team, members: nextMembers }, false, team.id);
      showToast(`Left Team "${team.name}" successfully.`, 'info');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Operation failed.', 'error');
    }
  };

  const handleDisbandTeam = async (team) => {
    if (!window.confirm(`Disband "${team.name}"? This will delete the team permanently for all members.`)) return;

    try {
      await deleteTeam(team.id);
      showToast(`Team "${team.name}" has been disbanded.`, 'info');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to disband team.', 'error');
    }
  };

  return (
    <div id="page-teams" className="page-enter">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-outfit font-black text-3xl text-slate-100 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block">
            Hackathon Teams
          </h1>
          <p className="text-[14.5px] text-slate-450 mt-1">
            Build squads, coordinate projects, and share credentials with teammates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1.5 border border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-300 font-semibold font-outfit px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 text-sm"
          >
            <Search size={15} /> Join with Code
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-accent text-white font-semibold font-outfit px-4 py-2.5 rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-95 text-sm"
          >
            <Plus size={16} /> Create Squad
          </button>
        </div>
      </div>

      {/* Primary Panels */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="spinner border-4 border-slate-800 border-t-primary w-10 h-10 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Syncing rosters...</span>
        </div>
      ) : teams.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center border border-slate-800/60">
          <span className="text-4xl">🤖</span>
          <h3 className="font-outfit font-extrabold text-lg text-slate-200 mt-4">No Squads Joined</h3>
          <p className="text-sm text-slate-450 mt-1.5 max-w-md mx-auto">
            You aren't associated with any teams yet. Create a new squad or enter a teammate's invite code to join!
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={() => setShowJoinModal(true)}
              className="text-xs border border-slate-800 hover:border-slate-700 bg-slate-950/40 px-4 py-2 rounded-lg font-semibold text-slate-350 transition-colors"
            >
              Enter Code
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="text-xs bg-primary hover:bg-primary/95 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors"
            >
              Create Team
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map(team => {
            const isLeader = team.leaderId === userData.uid;
            const sizePercent = Math.min(100, Math.round((team.members?.length / team.maxSize) * 100));

            return (
              <div
                key={team.id}
                className="bg-slate-900/45 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/35 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-[5px] truncate max-w-[200px]" title={eventMap[team.eventId]}>
                      🎯 {eventMap[team.eventId] || 'Special Event'}
                    </span>

                    <button
                      onClick={() => handleCopyCode(team.inviteCode)}
                      className="text-xs bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 px-2 py-1 rounded-md transition-colors flex items-center gap-1 font-mono tracking-wide"
                      title="Click to copy invite code"
                    >
                      <Copy size={11} /> {team.inviteCode}
                    </button>
                  </div>

                  <h3 className="font-outfit font-black text-xl text-slate-100 mb-1 leading-snug flex items-center gap-2">
                    {team.name}
                    {isLeader && <Award size={18} className="text-amber-500 animate-pulse" title="Squad Captain" />}
                  </h3>

                  <p className="text-slate-400 text-[13.5px] line-clamp-2 my-3 leading-relaxed">
                    {team.description || 'No description supplied. Work hard, code fast, and win! 💻'}
                  </p>
                </div>

                <div className="mt-4">
                  {/* Capacity Info */}
                  <div className="mb-4 bg-slate-950/40 border border-slate-800/40 p-3 rounded-xl">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                      <span>Squad Members</span>
                      <span>{team.members?.length} / {team.maxSize}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${sizePercent === 100 ? 'bg-accent' : 'bg-primary'}`}
                        style={{ width: `${sizePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 gap-3">
                    <span className="text-[10.5px] text-slate-500 font-semibold italic">
                      Created {new Date(team.created_at || team.createdAt).toLocaleDateString()}
                    </span>

                    {isLeader ? (
                      <button
                        onClick={() => handleDisbandTeam(team)}
                        className="text-xs text-danger border border-danger/20 hover:bg-danger/10 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 size={13} /> Disband
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLeaveTeam(team)}
                        className="text-xs text-slate-450 border border-slate-800 hover:bg-slate-850 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <LogOut size={13} /> Leave Team
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: JOIN TEAM WITH CODE */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden page-enter">
            <div className="p-4 sm:p-5 border-b border-slate-850 flex justify-between items-center">
              <h3 className="font-outfit font-black text-lg text-slate-100 flex items-center gap-1.5">
                <Sparkles size={17} className="text-primary" /> Join a Tech Squad
              </h3>
              <button
                onClick={() => { setShowJoinModal(false); setInviteCodeInput(''); }}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-850 p-1.5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleJoinTeamByCode} className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-455 uppercase tracking-wider">Invite Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HT-K8D9F2"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 text-center font-mono font-bold tracking-widest text-slate-100 uppercase focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-850 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowJoinModal(false); setInviteCodeInput(''); }}
                  className="px-4 py-2 text-slate-400 border border-slate-800 rounded-xl hover:bg-slate-850 text-xs font-semibold font-outfit"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="px-5 py-2 text-white bg-primary hover:bg-primary/95 rounded-xl text-xs font-semibold font-outfit shadow-lg shadow-primary/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  {joining ? 'Searching...' : 'Join Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TEAM */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden page-enter">
            <div className="p-4 sm:p-5 border-b border-slate-850 flex justify-between items-center">
              <h3 className="font-outfit font-black text-xl text-slate-100">
                Form a Hackathon Squad
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-450 hover:text-slate-200 hover:bg-slate-850 p-1.5 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-4 sm:p-5 flex flex-col gap-3.5 sm:gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Select Event *</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => handleEventSelectChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-900 text-slate-250 font-semibold"
                >
                  {joinedEvents.map(e => (
                    <option key={e.id} value={e.id} className="bg-slate-950">
                      {e.title} (Max: {e.maxTeamSize} members)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Team / Squad Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pixel Pioneers"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Squad Description</label>
                <textarea
                  rows={3}
                  placeholder="Focus area, required roles, or project details..."
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 focus:ring-4 focus:ring-primary/10 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Max Size (Determined by Event)</label>
                <input
                  type="number"
                  disabled
                  value={maxSize}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-850 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-400 border border-slate-800 rounded-xl hover:bg-slate-850 text-xs font-semibold font-outfit"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-white bg-primary hover:bg-primary/95 rounded-xl text-xs font-semibold font-outfit shadow-lg shadow-primary/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Launch Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
