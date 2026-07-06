import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../../supabase';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  fetchEvents, saveEvent, deleteEvent,
  fetchTeams, saveTeam, deleteTeam,
  fetchPosts, savePost, deletePost,
  fetchProfiles, saveProfile
} from '../../utils/supabaseFallback';
import { 
  TrendingUp, BarChart2, Calendar, Users, FileText, 
  Megaphone, FolderOpen, Award, MessageSquare, Settings, 
  Plus, Edit, Trash2, Download, Search, Check, X, Shield, ArrowRight, Info, Sparkles
} from 'lucide-react';
import Organisers from './Organisers';
import Participants from './Participants';

export default function OrganiserConsole({ activeTab: propActiveTab }) {
  const { userData: activeUser, showToast } = useApp();
  const navigate = useNavigate();

  const activeTab = useMemo(() => {
    if (propActiveTab && propActiveTab.startsWith('org-')) {
      return propActiveTab.replace('org-', '');
    }
    return 'dashboard';
  }, [propActiveTab]);

  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sub-tab state inside Participants
  const [participantSubTab, setParticipantSubTab] = useState('participants-list'); // 'participants-list' | 'admins-list'

  // Form states for Event
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventFormMode, setEventFormMode] = useState('create');
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Custom delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, eventId: null, eventTitle: '' });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [tagsInput, setTagsInput] = useState('');
  const [date, setDate] = useState('');
  const [lastDate, setLastDate] = useState('');
  const [themeField, setThemeField] = useState('');
  const [prizeField, setPrizeField] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Announcement State
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementCategory, setAnnouncementCategory] = useState('info');
  const [announcements, setAnnouncements] = useState([]);

  // Results / Winners State
  const [selectedEventForResults, setSelectedEventForResults] = useState('');
  const [winner1, setWinner1] = useState('');
  const [winner2, setWinner2] = useState('');
  const [winner3, setWinner3] = useState('');
  const [projectShowcase, setProjectShowcase] = useState('');
  const [resultsMap, setResultsMap] = useState({});
  const [selectedEventIdForRegs, setSelectedEventIdForRegs] = useState('');

  // Team Merging States
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Organizer Profile States
  const [orgName, setOrgName] = useState(() => localStorage.getItem('ht_org_name') || 'Chief Organizer');
  const [orgDept, setOrgDept] = useState(() => localStorage.getItem('ht_org_dept') || 'Department of Technology');
  const [orgEmail, setOrgEmail] = useState(() => localStorage.getItem('ht_org_email') || 'organizer@hacktech.com');
  const [orgHotline, setOrgHotline] = useState(() => localStorage.getItem('ht_org_hotline') || '+1 (555) 480-1280');

  // Event Channel Announcement State
  const [channelEventId, setChannelEventId] = useState('');
  const [channelMessage, setChannelMessage] = useState('');
  const [channelCategory, setChannelCategory] = useState('info');

  // Team Approvals State
  const [teamApprovals, setTeamApprovals] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ht_team_approvals')) || {};
    } catch {
      return {};
    }
  });

  const handleToggleTeamApproval = (teamId, status) => {
    const nextApprovals = { ...teamApprovals, [teamId]: status };
    setTeamApprovals(nextApprovals);
    localStorage.setItem('ht_team_approvals', JSON.stringify(nextApprovals));
    showToast(`Team approval status updated to ${status.toUpperCase()}!`, status === 'approved' ? 'success' : 'info');
  };

  const handleUpdateTeamMaxSize = async (teamId, nextSize) => {
    if (!nextSize || nextSize < 1) return;
    try {
      const targetTeam = teams.find(t => t.id === teamId);
      if (!targetTeam) throw new Error('Team not found');
      await saveTeam({ ...targetTeam, maxSize: parseInt(nextSize) }, false, teamId);
      showToast('Maximum team size updated successfully!', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to update team size: ' + err.message, 'error');
    }
  };

  // Direct Message Form States
  const [targetEventForMsg, setTargetEventForMsg] = useState('');
  const [directMsgText, setDirectMsgText] = useState('');
  const [directMsgUrgency, setDirectMsgUrgency] = useState('info');

  const handleSendDirectMessage = (e) => {
    e.preventDefault();
    if (!targetEventForMsg || !directMsgText.trim()) {
      showToast('Select an Event and enter a message.', 'warning');
      return;
    }

    const targetEvent = events.find(ev => ev.id === targetEventForMsg);
    const eventName = targetEvent ? targetEvent.title : 'Hackathon';
    
    const newBroadcast = {
      id: Math.random().toString(36).substring(2, 9),
      text: `[${eventName}] ${directMsgText.trim()}`,
      category: directMsgUrgency, // 'info' | 'warning' | 'success'
      eventId: targetEventForMsg,
      createdAt: new Date().toISOString()
    };

    const nextAnnouncements = [newBroadcast, ...announcements];
    setAnnouncements(nextAnnouncements);
    localStorage.setItem('ht_announcements', JSON.stringify(nextAnnouncements));
    setDirectMsgText('');
    showToast(`Alert message sent successfully to registered developers of "${eventName}"!`, 'success');
  };

  // Load Extra Metadata Fallbacks
  const usersExtraMap = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('ht_users_extra')) || {};
    } catch {
      return {};
    }
  }, [users]);

  // Load all dashboard aggregate data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Users
      const usersData = await fetchProfiles();
      setUsers(usersData || []);

      // Fetch Events
      const eventsData = await fetchEvents();
      const sortedEvents = (eventsData || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(sortedEvents);

      // Fetch Teams
      const teamsData = await fetchTeams();
      setTeams(teamsData || []);

      // Fetch Blog Posts
      const postsData = await fetchPosts();
      const sortedPosts = (postsData || []).sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
      setPosts(sortedPosts);

      // Load Local Storage Extras
      setAnnouncements(JSON.parse(localStorage.getItem('ht_announcements')) || []);
      setResultsMap(JSON.parse(localStorage.getItem('ht_results')) || {});
    } catch (err) {
      showToast('Error syncing dashboard console data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Export Participant list to CSV
  const handleExportCSV = () => {
    const participantsOnly = users.filter(u => u.role === 'participant');
    if (participantsOnly.length === 0) return;
    const headers = ['Name', 'Email', 'Role', 'Joined Events Count', 'Skills', 'Location'];
    const rows = participantsOnly.map(u => {
      const extra = usersExtraMap[u.id] || { skills: '', location: '' };
      return [
        u.name || 'User',
        u.email,
        u.role || 'participant',
        u.joinedEvents?.length || 0,
        extra.skills || 'General Tech',
        extra.location || 'Remote'
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hacktech_registry_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Participant registry exported successfully as CSV!', 'success');
  };

  // Event creation & updates
  const handleOpenCreateEvent = () => {
    setEventFormMode('create');
    setTitle('');
    setDescription('');
    setLocation('');
    setMaxParticipants(100);
    setMaxTeamSize(4);
    setTagsInput('');
    setDate('');
    setLastDate('');
    setThemeField('');
    setPrizeField('');
    setBannerUrl('');
    setShowEventModal(true);
  };

  const handleOpenEditEvent = (ev) => {
    setEventFormMode('edit');
    setSelectedEventId(ev.id);
    setTitle(ev.title);
    setDescription(ev.description);
    setLocation(ev.location);
    setMaxParticipants(ev.maxParticipants);
    setTagsInput(ev.tags ? ev.tags.join(', ') : '');
    
    // Load metadata extras (theme, prize, bannerUrl, lastDate, maxTeamSize)
    // For locally-created events, these are stored directly on the event object.
    // For DB events, they are stored in ht_events_extra localStorage.
    const extras = JSON.parse(localStorage.getItem('ht_events_extra')) || {};
    const extraInfo = extras[ev.id] || {};
    setThemeField(ev.theme || extraInfo.theme || '');
    setPrizeField(ev.prize || extraInfo.prize || '');
    setBannerUrl(ev.bannerUrl || extraInfo.bannerUrl || '');
    setMaxTeamSize(ev.maxTeamSize || extraInfo.maxTeamSize || 4);

    // Format dates for input type datetime-local
    if (ev.date) {
      const d = new Date(ev.date);
      const tzoffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
      setDate(localISOTime);
    } else {
      setDate('');
    }

    const lastDateValue = ev.lastDate || extraInfo.lastDate;
    if (lastDateValue) {
      const d = new Date(lastDateValue);
      const tzoffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
      setLastDate(localISOTime);
    } else {
      setLastDate('');
    }
    
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!title || !description || !location || !date || !lastDate) {
      showToast('Please provide Name, Location, Start Date, Last Date, and Description.', 'warning');
      return;
    }

    // Merge themeField into tag list
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    if (themeField && !tags.includes(themeField)) {
      tags.push(themeField);
    }

    const fullEventPayload = {
      title,
      description,
      location,
      maxParticipants: parseInt(maxParticipants),
      date: new Date(date).toISOString(),
      maxTeamSize: parseInt(maxTeamSize),
      tags,
      createdBy: activeUser.uid,
      bannerUrl: bannerUrl.trim() || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200',
      theme: themeField.trim(),
      prize: prizeField.trim(),
      lastDate: new Date(lastDate).toISOString(),
      participants: eventFormMode === 'create' ? [] : undefined
    };

    try {
      if (eventFormMode === 'create') {
        await saveEvent(fullEventPayload, true);
        showToast(`Tech Event "${title}" registered successfully!`, 'success');
      } else {
        await saveEvent(fullEventPayload, false, selectedEventId);
        showToast('Tech Event updated successfully!', 'success');
      }
      setShowEventModal(false);
      fetchData();
    } catch (err) {
      showToast('Saving event failed: ' + err.message, 'error');
    }
  };

  const handleRequestDeleteEvent = (id, title) => {
    setDeleteConfirm({ show: true, eventId: id, eventTitle: title || 'this event' });
  };

  const handleConfirmDeleteEvent = async () => {
    const id = deleteConfirm.eventId;
    setDeleteConfirm({ show: false, eventId: null, eventTitle: '' });
    try {
      await deleteEvent(id);
      showToast('Event removed from platform records.', 'info');
      fetchData();
    } catch (err) {
      showToast('Failed to delete event: ' + err.message, 'error');
    }
  };

  // Blog Moderation
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this experience story?')) return;
    try {
      await deletePost(postId);
      showToast('Post removed from catalog.', 'info');
      setPosts(posts.filter(p => p.id !== postId));
    } catch {
      showToast('Failed to remove blog story.', 'error');
    }
  };

  const handleToggleFeaturePost = (postId) => {
    const featured = JSON.parse(localStorage.getItem('ht_featured_posts')) || [];
    let nextFeatured;
    if (featured.includes(postId)) {
      nextFeatured = featured.filter(id => id !== postId);
      showToast('Story removed from featured showcase.', 'info');
    } else {
      nextFeatured = [...featured, postId];
      showToast('Story highlighted as Featured!', 'success');
    }
    localStorage.setItem('ht_featured_posts', JSON.stringify(nextFeatured));
    fetchData();
  };

  // Registration approvals
  const handleToggleRegistrationStatus = (eventId, userId, status) => {
    const regs = JSON.parse(localStorage.getItem('ht_registrations')) || {};
    if (!regs[eventId]) regs[eventId] = {};
    regs[eventId][userId] = status; // 'approved' | 'rejected'
    localStorage.setItem('ht_registrations', JSON.stringify(regs));
    showToast(`Participant registration ${status}.`, status === 'approved' ? 'success' : 'info');
    fetchData();
  };

  // Toggle roles
  const handleToggleRole = async (userToToggle) => {
    const nextRole = userToToggle.role === 'organiser' ? 'participant' : 'organiser';
    if (!window.confirm(`Are you sure you want to toggle ${userToToggle.name || userToToggle.email}'s role to "${nextRole}"?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: nextRole })
        .eq('id', userToToggle.id);
      if (error) throw error;
      showToast(`User successfully updated to "${nextRole}".`, 'success');
      setUsers(users.map(u => u.id === userToToggle.id ? { ...u, role: nextRole } : u));
    } catch (err) {
      showToast('Failed to toggle role: ' + err.message, 'error');
    }
  };

  // Delete User Profiles
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this developer profile? They will lose platform access.')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      if (error) throw error;
      const extras = JSON.parse(localStorage.getItem('ht_users_extra')) || {};
      delete extras[userId];
      localStorage.setItem('ht_users_extra', JSON.stringify(extras));
      showToast('User profile removed permanently.', 'info');
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      showToast('Failed to delete user profile: ' + err.message, 'error');
    }
  };

  // Teams disband
  const handleDisbandTeam = async (teamId, teamName) => {
    if (!window.confirm(`Disband the team "${teamName}" permanently?`)) return;
    try {
      await deleteTeam(teamId);
      showToast(`Squad "${teamName}" has been dissolved.`, 'info');
      fetchData();
    } catch {
      showToast('Failed to disband squad.', 'error');
    }
  };

  // Teams merging
  const handleMergeTeams = async (e) => {
    e.preventDefault();
    if (!team1Id || !team2Id) {
      showToast('Select two active teams to merge.', 'warning');
      return;
    }
    if (team1Id === team2Id) {
      showToast('Cannot merge a team into itself.', 'warning');
      return;
    }

    const t1 = teams.find(t => t.id === team1Id);
    const t2 = teams.find(t => t.id === team2Id);

    if (t1.eventId !== t2.eventId) {
      showToast('Teams must belong to the same tech event.', 'error');
      return;
    }

    const combinedMembers = Array.from(new Set([...(t1.members || []), ...(t2.members || [])]));
    if (combinedMembers.length > t1.maxSize) {
      showToast(`Combined squad size exceeds the team limit of ${t1.maxSize}.`, 'warning');
      return;
    }

    try {
      setLoading(true);
      // Update Team 1 members
      await saveTeam({ ...t1, members: combinedMembers }, false, team1Id);

      // Dissolve Team 2
      await deleteTeam(team2Id);

      showToast(`Successfully merged squads into "${t1.name}"!`, 'success');
      setTeam1Id('');
      setTeam2Id('');
      fetchData();
    } catch (err) {
      showToast('Failed to merge squads.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Broadcaster
  const handleBroadcastAnnouncement = (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    const newBroadcast = {
      id: Math.random().toString(36).substring(2, 9),
      text: announcementText.trim(),
      category: announcementCategory, // 'info' | 'warning' | 'success' | 'winners'
      createdAt: new Date().toISOString()
    };

    const nextAnnouncements = [newBroadcast, ...announcements];
    setAnnouncements(nextAnnouncements);
    localStorage.setItem('ht_announcements', JSON.stringify(nextAnnouncements));
    setAnnouncementText('');
    showToast(`Global event broadcast dispatched successfully! Category: ${announcementCategory.toUpperCase()}`, 'success');
  };

  const handleDeleteAnnouncement = (id) => {
    const nextAnnouncements = announcements.filter(a => a.id !== id);
    setAnnouncements(nextAnnouncements);
    localStorage.setItem('ht_announcements', JSON.stringify(nextAnnouncements));
    showToast('Broadcast alert removed.', 'info');
  };

  // Event Channel Announcements
  const handlePostToEventChannel = (e) => {
    e.preventDefault();
    if (!channelEventId || !channelMessage.trim()) {
      showToast('Please select an event and type a message.', 'warning');
      return;
    }

    const eventTitle = events.find(ev => ev.id === channelEventId)?.title || 'Event';
    const msg = {
      id: Math.random().toString(36).substring(2, 9),
      text: channelMessage.trim(),
      category: channelCategory,
      authorName: userData?.name || 'Organiser',
      createdAt: new Date().toISOString()
    };

    const channels = JSON.parse(localStorage.getItem('ht_event_channels')) || {};
    if (!channels[channelEventId]) channels[channelEventId] = [];
    channels[channelEventId] = [msg, ...channels[channelEventId]];
    localStorage.setItem('ht_event_channels', JSON.stringify(channels));
    setChannelMessage('');
    showToast(`Announcement posted to "${eventTitle}" channel!`, 'success');
  };

  const handleDeleteChannelMessage = (eventId, msgId) => {
    const channels = JSON.parse(localStorage.getItem('ht_event_channels')) || {};
    if (channels[eventId]) {
      channels[eventId] = channels[eventId].filter(m => m.id !== msgId);
      localStorage.setItem('ht_event_channels', JSON.stringify(channels));
      showToast('Channel message removed.', 'info');
    }
  };

  // Publish Results / Winners
  const handlePublishResults = (e) => {
    e.preventDefault();
    if (!selectedEventForResults || !winner1) {
      showToast('Please choose an Event and define the 1st Place winner.', 'warning');
      return;
    }

    const currentResults = JSON.parse(localStorage.getItem('ht_results')) || {};
    currentResults[selectedEventForResults] = {
      first: winner1,
      second: winner2 || 'Not Published',
      third: winner3 || 'Not Published',
      showcase: projectShowcase || ''
    };

    setResultsMap(currentResults);
    localStorage.setItem('ht_results', JSON.stringify(currentResults));
    
    // Broadcast the winners automatically!
    const selectedEvent = events.find(ev => ev.id === selectedEventForResults);
    const eventName = selectedEvent ? selectedEvent.title : 'Hackathon';
    const text = `🏆 WINNERS ANNOUNCED for ${eventName}! 🥇 1st Place: ${winner1} | 🥈 2nd Place: ${winner2 || 'N/A'} | 🥉 3rd Place: ${winner3 || 'N/A'}`;
    
    const newBroadcast = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      category: 'winners',
      createdAt: new Date().toISOString()
    };
    const nextAnnouncements = [newBroadcast, ...announcements];
    setAnnouncements(nextAnnouncements);
    localStorage.setItem('ht_announcements', JSON.stringify(nextAnnouncements));

    setWinner1('');
    setWinner2('');
    setWinner3('');
    setProjectShowcase('');
    showToast(`Winners published and globally broadcasted for ${eventName}!`, 'success');
  };

  // Settings save
  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('ht_org_name', orgName);
    localStorage.setItem('ht_org_dept', orgDept);
    localStorage.setItem('ht_org_email', orgEmail);
    localStorage.setItem('ht_org_hotline', orgHotline);
    showToast('Administrative organizer configurations saved.', 'success');
  };

  // Filter users by search in registrations
  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    const extra = usersExtraMap[u.id] || { skills: '', location: '' };
    return (
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      extra.skills?.toLowerCase().includes(query) ||
      extra.location?.toLowerCase().includes(query)
    );
  });

  return (
    <div id="page-organiser-console" className="page-enter w-full">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="spinner border-4 border-slate-800 border-t-primary w-10 h-10 rounded-full animate-spin"></div>
          <span className="text-sm text-slate-550 font-medium">Syncing Command Hub...</span>
        </div>
      ) : (
        <div className="w-full">
          {/* SECTION 1: OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-8 w-full page-enter">
              {/* Dashboard Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-outfit font-black text-2xl sm:text-3xl text-slate-100 mb-1 leading-tight">
                    Welcome back, Organiser! 👋
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Manage your events, participants and keep track of everything here.
                  </p>
                </div>
                <button
                  onClick={handleOpenCreateEvent}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-white font-bold font-outfit px-5 py-3 rounded-xl text-xs sm:text-sm shadow-lg shadow-primary/10 active:scale-95 transition-all self-start sm:self-center"
                >
                  <Plus size={16} /> Create New Event
                </button>
              </div>

              {/* Metrics Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/40 transition-all">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Events</span>
                    <span className="font-outfit font-black text-3xl text-slate-100 block mt-1.5">{events.length}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 mt-2 block">↗ +12% from last month</span>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/40 transition-all">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Participants</span>
                    <span className="font-outfit font-black text-3xl text-slate-100 block mt-1.5">{users.filter(u => u.role !== 'admin').length}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 mt-2 block">↗ +18% from last month</span>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/40 transition-all">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Teams</span>
                    <span className="font-outfit font-black text-3xl text-slate-100 block mt-1.5">{teams.length}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 mt-2 block">↗ +10% from last month</span>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/40 transition-all">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Organisers</span>
                    <span className="font-outfit font-black text-3xl text-slate-100 block mt-1.5">{users.filter(u => u.role === 'organiser').length}</span>
                  </div>
                  <button 
                    onClick={() => { navigate('/dashboard/organiser/participants'); setParticipantSubTab('admins-list'); }}
                    className="text-[10px] font-bold text-primary hover:underline mt-2 text-left block"
                  >
                    View active registry →
                  </button>
                </div>
              </div>

              {/* Middle Row: Registrations Chart & Recent Events */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* SVG Curve Chart */}
                <div className="lg:col-span-7 bg-slate-900/45 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-outfit font-black text-slate-200 text-[15px] sm:text-base">Registrations Overview</h4>
                    <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold">● Registrations</span>
                  </div>
                  <div className="w-full relative h-[180px] bg-slate-950/20 border border-slate-900/50 rounded-xl p-2.5 flex items-end">
                    {/* Smooth Vector Drawing */}
                    <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M0 120 C 75 110, 150 70, 225 90 C 300 110, 375 50, 450 30 C 475 20, 500 10, 500 10 L 500 150 L 0 150 Z" 
                        fill="url(#chartGrad)"
                      />
                      <path 
                        d="M0 120 C 75 110, 150 70, 225 90 C 300 110, 375 50, 450 30 C 475 20, 500 10, 500 10" 
                        fill="none" 
                        stroke="#8b5cf6" 
                        strokeWidth="3.5" 
                      />
                      <circle cx="225" cy="90" r="4.5" fill="#8b5cf6" stroke="#fff" strokeWidth="1.5" />
                      <circle cx="450" cy="30" r="4.5" fill="#06b6d4" stroke="#fff" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mt-3 px-2">
                    <span>May 20</span>
                    <span>May 22</span>
                    <span>May 24</span>
                    <span>May 26</span>
                  </div>
                </div>

                {/* Recent Events List */}
                <div className="lg:col-span-5 bg-slate-900/45 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-outfit font-black text-slate-200 text-[15px] sm:text-base">Recent Events</h4>
                    <button 
                      onClick={() => navigate('/dashboard/organiser/events')}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {events.slice(0, 3).map(ev => {
                      const isUpcoming = new Date(ev.date) > new Date();
                      const eventExtras = JSON.parse(localStorage.getItem('ht_events_extra')) || {};
                      const lastDateVal = ev.lastDate || eventExtras[ev.id]?.lastDate;
                      return (
                        <div key={ev.id} className="bg-slate-950/40 border border-slate-905 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                          <div>
                            <h5 className="font-bold text-slate-205 line-clamp-1">{ev.title}</h5>
                            <div className="text-[10px] text-slate-450 mt-1 flex flex-wrap gap-2">
                              <span>📍 {ev.location}</span>
                              <span>📅 {new Date(ev.date).toLocaleDateString()}{lastDateVal ? ` - ${new Date(lastDateVal).toLocaleDateString()}` : ''}</span>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-[4px] border ${isUpcoming ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                            {isUpcoming ? 'Upcoming' : 'Completed'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: EVENT CATALOG */}
          {activeTab === 'events' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-outfit font-black text-xl text-slate-100 flex items-center gap-2">
                  <Calendar size={20} className="text-primary" /> Event Catalog
                </h3>
                <button
                  onClick={handleOpenCreateEvent}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white font-semibold font-outfit px-4 py-2 rounded-xl text-xs"
                >
                  <Plus size={14} /> New Event
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Search events by name, description, or tags (e.g. React, AI)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-805 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold placeholder-slate-550 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events
                  .filter(ev => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      ev.title?.toLowerCase().includes(q) ||
                      ev.description?.toLowerCase().includes(q) ||
                      (ev.tags && ev.tags.some(t => t.toLowerCase().includes(q)))
                    );
                  })
                  .map(ev => {
                  const extras = JSON.parse(localStorage.getItem('ht_events_extra')) || {};
                  const theme = ev.theme || extras[ev.id]?.theme || 'Tech Challenge';
                  const prize = ev.prize || extras[ev.id]?.prize || 'Recognition';

                  return (
                    <div key={ev.id} className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-bold text-slate-100 font-outfit text-base sm:text-lg line-clamp-1">{ev.title}</h4>
                          <span className="text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded uppercase shrink-0">
                            {theme}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-450 mt-2 font-medium">
                          <span>📍 {ev.location}</span>
                          <span>📅 {new Date(ev.date).toLocaleDateString()}{(ev.lastDate || extras[ev.id]?.lastDate) ? ` - ${new Date(ev.lastDate || extras[ev.id].lastDate).toLocaleDateString()}` : ''}</span>
                          <span>⏳ {ev.participants?.length || 0} / {ev.maxParticipants} Registrants</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mt-3">{ev.description}</p>

                        {/* Tag Pills */}
                        {ev.tags && ev.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {ev.tags.map((tag, idx) => (
                              <span key={idx} className="text-[10px] font-semibold text-slate-300 bg-slate-850 border border-slate-700/60 px-2 py-0.5 rounded-[6px]">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          🏆 Prize: {prize}
                        </span>

                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenEditEvent(ev)}
                            className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                            title="Edit Event Details"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRequestDeleteEvent(ev.id, ev.title); }}
                            className="p-2 border border-slate-800 hover:border-danger/30 bg-slate-950 hover:bg-danger/10 rounded-lg text-slate-500 hover:text-danger transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: REGISTRATIONS MANAGEMENT */}
          {activeTab === 'registrations' && (
            <div className="flex flex-col gap-6 page-enter">
              <div>
                <h3 className="font-outfit font-black text-xl text-slate-100 flex items-center gap-2">
                  <Users size={20} className="text-primary" /> Event Registrations Manager
                </h3>
                <p className="text-xs text-slate-500 mt-1">Review, approve, and reject developer registrations per tech event.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-bold text-slate-450 uppercase tracking-widest">Select Tech Event</label>
                  <select
                    value={selectedEventIdForRegs || (events[0]?.id || '')}
                    onChange={(e) => setSelectedEventIdForRegs(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-primary/50"
                  >
                    <option value="">-- Choose Event context --</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-8 flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-bold text-slate-455 uppercase tracking-widest">Filter Registrations</label>
                  <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Filter registrants by email, name, location, or skills..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-805 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold placeholder-slate-550 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Registrations List table */}
              {(() => {
                const currentEventId = selectedEventIdForRegs || events[0]?.id || '';
                const currentEvent = events.find(e => e.id === currentEventId);
                const participantIds = currentEvent?.participants || [];
                const eventRegistrants = users.filter(u => participantIds.includes(u.id));
                
                const filteredRegs = eventRegistrants.filter(u => {
                  const query = searchQuery.toLowerCase();
                  const extra = usersExtraMap[u.id] || { skills: '', location: '' };
                  return (
                    u.name?.toLowerCase().includes(query) ||
                    u.email?.toLowerCase().includes(query) ||
                    extra.skills?.toLowerCase().includes(query) ||
                    extra.location?.toLowerCase().includes(query)
                  );
                });

                if (!currentEventId) {
                  return (
                    <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-10 text-center text-xs text-slate-505 italic">
                      Please select or create an event first to review registrations.
                    </div>
                  );
                }

                if (filteredRegs.length === 0) {
                  return (
                    <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-10 text-center text-xs text-slate-505 italic">
                      No developer registrations found matching your query for this event.
                    </div>
                  );
                }

                const regs = JSON.parse(localStorage.getItem('ht_registrations')) || {};

                return (
                  <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-850/60 border-b border-slate-800 text-slate-450 uppercase font-bold tracking-wider">
                            <th className="px-5 py-3.5">Developer Identity</th>
                            <th className="px-5 py-3.5">Location</th>
                            <th className="px-5 py-3.5">Technical Domains</th>
                            <th className="px-5 py-3.5">Status Badge</th>
                            <th className="px-5 py-3.5 text-center">Approvals Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {filteredRegs.map(u => {
                            const extra = usersExtraMap[u.id] || { skills: '', location: '' };
                            const status = regs[currentEventId]?.[u.id] || 'pending';
                            const initials = u.name
                              ? u.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
                              : u.email.split('@')[0].substring(0, 2).toUpperCase();

                            return (
                              <tr key={u.id} className="hover:bg-slate-900/20 transition-colors">
                                <td className="px-5 py-4 flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-primary font-black shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-200 text-sm">{u.name || 'Developer'}</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{u.email}</div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-slate-350 font-medium">
                                  📍 {extra.location || 'Remote'}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex flex-wrap gap-1">
                                    {(extra.skills || 'General Tech').split(',').map((sk, idx) => (
                                      <span key={idx} className="text-[9px] bg-slate-905 border border-slate-800/80 text-slate-450 px-1.5 py-0.5 rounded">
                                        #{sk.trim()}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  {status === 'approved' ? (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 uppercase tracking-wider">APPROVED</span>
                                  ) : status === 'rejected' ? (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] border bg-danger/10 border-danger/20 text-danger uppercase tracking-wider">REJECTED</span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] border bg-warning/10 border-warning/20 text-warning uppercase tracking-wider">PENDING</span>
                                  )}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleToggleRegistrationStatus(currentEventId, u.id, 'approved')}
                                      className={`p-1.5 rounded-lg border text-slate-550 transition-colors ${status === 'approved' ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-500' : 'border-slate-800 hover:border-emerald-500/35 hover:text-emerald-500 hover:bg-emerald-500/5'}`}
                                      title="Approve Developer"
                                    >
                                      <Check size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleToggleRegistrationStatus(currentEventId, u.id, 'rejected')}
                                      className={`p-1.5 rounded-lg border text-slate-550 transition-colors ${status === 'rejected' ? 'bg-danger/15 border-danger/35 text-danger' : 'border-slate-800 hover:border-danger/35 hover:text-danger hover:bg-danger/5'}`}
                                      title="Reject Developer"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* SECTION 4: SEARCHABLE PARTICIPANT DIRECTORY / SUBCOMPONENTS */}
          {activeTab === 'participants' && (
            <div className="flex flex-col gap-6 page-enter">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-4">
                <div>
                  <h3 className="font-outfit font-black text-xl text-slate-100 flex items-center gap-2">
                    <Users size={20} className="text-primary" /> Administrative Registry
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Manage global system developers, elevate roles, and revoke accounts.</p>
                </div>

                {/* Sub-tab segmented pill switch controls */}
                <div className="flex bg-slate-950 border border-slate-900 rounded-xl p-1 shrink-0 font-outfit select-none">
                  <button
                    onClick={() => setParticipantSubTab('participants-list')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      participantSubTab === 'participants-list'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-slate-500 hover:text-slate-350 border border-transparent'
                    }`}
                  >
                    👥 Participants
                  </button>
                  <button
                    onClick={() => setParticipantSubTab('admins-list')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      participantSubTab === 'admins-list'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'text-slate-500 hover:text-slate-350 border border-transparent'
                    }`}
                  >
                    🛡️ Organisers
                  </button>
                </div>
              </div>

              {participantSubTab === 'participants-list' ? (
                <Participants 
                  users={users} 
                  showToast={showToast} 
                  handleToggleRole={handleToggleRole} 
                  handleDeleteUser={handleDeleteUser} 
                  handleExportCSV={handleExportCSV}
                />
              ) : (
                <Organisers 
                  users={users} 
                  showToast={showToast} 
                  handleToggleRole={handleToggleRole} 
                  handleDeleteUser={handleDeleteUser}
                  currentUser={activeUser}
                />
              )}
            </div>
          )}

          {/* SECTION 5: SQUAD COORDINATOR / TEAM MONITORING */}
          {activeTab === 'teams' && (
            <div className="flex flex-col gap-6 page-enter">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-outfit font-black text-xl text-slate-100 flex items-center gap-2">
                    <Users size={20} className="text-primary" /> Squad Control & Team Approvals Console
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Review team composition, approve or reject squads, merge developer teams, and manage active size limits.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Merge Squads tool */}
                <form onSubmit={handleMergeTeams} className="lg:col-span-7 bg-slate-955/20 border border-slate-900 rounded-2xl p-5 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    🔀 Merge Squads Tool
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">First Team (Primary Target)</label>
                      <select
                        value={team1Id}
                        onChange={(e) => setTeam1Id(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-350 focus:outline-none focus:border-primary/50"
                      >
                        <option value="">-- Choose Primary Team --</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({events.find(e => e.id === t.eventId)?.title || 'Custom Event'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Second Team (Source - Will Disband)</label>
                      <select
                        value={team2Id}
                        onChange={(e) => setTeam2Id(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-350 focus:outline-none focus:border-primary/50"
                      >
                        <option value="">-- Choose Source Team --</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="self-end bg-primary hover:bg-primary/95 text-white font-bold font-outfit px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Complete Squad Merge
                  </button>
                </form>

                {/* Right Column: Global metrics widget */}
                <div className="lg:col-span-5 bg-slate-955/20 border border-slate-900 rounded-2xl p-5 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">📊 Roster Insights</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Squads</span>
                      <span className="font-outfit font-black text-xl text-slate-200 mt-1 block">{teams.length}</span>
                    </div>
                    <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Pending Squads</span>
                      <span className="font-outfit font-black text-xl text-amber-500 mt-1 block">
                        {teams.filter(t => (teamApprovals[t.id] || 'pending') === 'pending').length}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10.5px] text-slate-450 leading-relaxed font-semibold">
                    💡 Tip: Dissolving a team releases all of its members, returning them to single status, while merging two teams combines members under the primary team.
                  </div>
                </div>
              </div>

              {/* Active Squads Approvals Board */}
              <div className="border-t border-slate-900/60 pt-6">
                <h4 className="text-xs font-bold text-slate-455 uppercase tracking-widest mb-4">🛡️ Active Squads approvals & Size Limits</h4>
                
                {teams.length === 0 ? (
                  <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-10 text-center text-xs text-slate-505 italic">
                    No squads currently registered on the platform.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map(t => {
                      const eventName = events.find(e => e.id === t.eventId)?.title || 'Tech Event';
                      const status = teamApprovals[t.id] || 'pending';
                      
                      // Map member user IDs to full user detail strings
                      const squadMembers = users.filter(u => t.members?.includes(u.id));

                      return (
                        <div key={t.id} className="bg-slate-900/30 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between gap-5 hover:border-primary/20 transition-all relative overflow-hidden">
                          {/* Premium Top Glow */}
                          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${status === 'approved' ? 'from-emerald-500 to-teal-500' : status === 'rejected' ? 'from-rose-500 to-red-600' : 'from-amber-500 to-orange-400'}`} />
                          
                          <div>
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <h5 className="font-bold text-slate-100 font-outfit text-base line-clamp-1">{t.name}</h5>
                                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">🎯 Event: {eventName}</span>
                              </div>
                              
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <span className="text-[9px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400 tracking-wider font-bold">
                                  CODE: {t.inviteCode}
                                </span>
                                {status === 'approved' ? (
                                  <span className="text-[8.5px] font-bold px-2 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 uppercase tracking-wider">APPROVED</span>
                                ) : status === 'rejected' ? (
                                  <span className="text-[8.5px] font-bold px-2 py-0.5 rounded border bg-rose-500/10 border-rose-500/20 text-rose-500 uppercase tracking-wider">REJECTED</span>
                                ) : (
                                  <span className="text-[8.5px] font-bold px-2 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 text-amber-500 uppercase tracking-wider">PENDING</span>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-slate-455 mt-2.5 leading-relaxed line-clamp-2 italic">{t.description || 'No squad description provided.'}</p>

                            {/* Squad Members Directory */}
                            <div className="mt-4 flex flex-col gap-1.5">
                              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">Squad Members ({t.members?.length || 0})</span>
                              {squadMembers.length === 0 ? (
                                <span className="text-[11px] text-slate-500 italic block pl-1">No active members in squad.</span>
                              ) : (
                                <div className="flex flex-col gap-1 pl-1">
                                  {squadMembers.map(m => (
                                    <div key={m.id} className="text-xs text-slate-350 flex items-center justify-between">
                                      <span className="font-semibold truncate">{m.name || 'Developer User'}</span>
                                      <span className="text-[10px] text-slate-550 font-mono shrink-0">{m.email}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Approval Actions & Max Team Size Management */}
                          <div className="border-t border-slate-850/60 pt-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                            {/* Max Size Management Slider Control */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10.5px] font-bold text-slate-450 uppercase shrink-0">Limit:</span>
                              <input 
                                type="number" 
                                min="1" 
                                max="10" 
                                value={t.maxSize || 4} 
                                onChange={(e) => handleUpdateTeamMaxSize(t.id, e.target.value)}
                                className="w-12 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-xs font-mono font-bold text-primary focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-500 font-semibold shrink-0">devs</span>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleTeamApproval(t.id, 'approved')}
                                className={`flex items-center gap-1 text-[10.5px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${status === 'approved' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500' : 'border-slate-800 text-slate-455 hover:bg-emerald-500/10 hover:text-emerald-500'}`}
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                onClick={() => handleToggleTeamApproval(t.id, 'rejected')}
                                className={`flex items-center gap-1 text-[10.5px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${status === 'rejected' ? 'bg-rose-500/15 border-rose-500/40 text-rose-500' : 'border-slate-800 text-slate-455 hover:bg-rose-500/10 hover:text-rose-500'}`}
                              >
                                <X size={12} /> Reject
                              </button>
                              
                              <button
                                onClick={() => handleDisbandTeam(t.id, t.name)}
                                className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-550 hover:text-rose-500 border border-transparent hover:border-rose-500/20 transition-all ml-1 shrink-0 cursor-pointer"
                                title="Dissolve Team"
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
            </div>
          )}

          {/* SECTION 6: BLOG MODERATION */}
          {activeTab === 'blogs' && (
            <div className="flex flex-col gap-6">
              <h3 className="font-outfit font-black text-xl text-slate-100 flex items-center gap-2">
                <FileText size={20} className="text-primary" /> Stream Experiences Moderator
              </h3>

              <div className="flex flex-col gap-4">
                {posts.map(p => {
                  const isFeatured = (JSON.parse(localStorage.getItem('ht_featured_posts')) || []).includes(p.id);
                  return (
                    <div key={p.id} className="bg-slate-950/45 border border-slate-900 p-5 rounded-xl flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-bold text-slate-200 text-base">{p.title}</h4>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">By {p.authorName} &bull; {new Date(p.created_at || p.createdAt).toLocaleDateString()}</p>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleFeaturePost(p.id)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${isFeatured ? 'bg-amber-500/10 border-amber-500/25 text-amber-500' : 'border-slate-800 text-slate-450 hover:bg-slate-900 hover:text-slate-200'}`}
                          >
                            {isFeatured ? '★ Featured' : '☆ Feature'}
                          </button>
                          <button
                            onClick={() => handleDeletePost(p.id)}
                            className="text-slate-500 hover:text-danger hover:bg-slate-900 p-1.5 rounded-lg transition-colors border border-slate-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-2">{p.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 7: ANNOUNCEMENTS & WINNERS */}
          {activeTab === 'announcements' && (
            <div className="flex flex-col gap-6">
              <h3 className="font-outfit font-black text-xl text-slate-100 flex items-center gap-2">
                <Megaphone size={20} className="text-primary" /> Global Broadcast System
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Broadcaster form */}
                <form onSubmit={handleBroadcastAnnouncement} className="lg:col-span-7 bg-slate-950/40 border border-slate-900 rounded-xl p-5 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">📢 Message Broadcast Tool</h4>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-bold text-slate-450 uppercase tracking-widest">Broadcast Category</label>
                    <select
                      value={announcementCategory}
                      onChange={(e) => setAnnouncementCategory(e.target.value)}
                      className="w-full max-w-[240px] bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-slate-350 font-semibold"
                    >
                      <option value="info">📢 Event Updates / Venue Details</option>
                      <option value="warning">⚠️ Urgent / Action Required</option>
                      <option value="success">🎉 Generic Notification</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-bold text-slate-450 uppercase tracking-widest">Message Update *</label>
                    <textarea
                      required
                      rows={3}
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      placeholder="e.g. Schedule adjustment: The AI track pitches will be moved up to 2:00 PM tomorrow in Hall 3."
                      className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-primary focus:bg-slate-950 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="self-end bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white font-bold font-outfit px-4 py-2 rounded-xl text-xs shadow-md"
                  >
                    Broadcast Globally
                  </button>
                </form>

                {/* Winners Publisher form */}
                <form onSubmit={handlePublishResults} className="lg:col-span-5 bg-slate-950/40 border border-slate-900 rounded-xl p-5 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">🏆 Announce Winner System</h4>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-bold text-slate-450 uppercase">Select Hackathon Event *</label>
                    <select
                      required
                      value={selectedEventForResults}
                      onChange={(e) => setSelectedEventForResults(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2 text-xs text-slate-350 font-semibold"
                    >
                      <option value="">-- Choose hackathon --</option>
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-bold text-slate-450 uppercase">🥇 1st Place Winner *</label>
                    <input
                      type="text"
                      required
                      value={winner1}
                      onChange={(e) => setWinner1(e.target.value)}
                      placeholder="e.g. Pixel Pioneers"
                      className="bg-slate-950 border border-slate-805 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">🥈 2nd Place</label>
                      <input
                        type="text"
                        value={winner2}
                        onChange={(e) => setWinner2(e.target.value)}
                        placeholder="e.g. Data Wizards"
                        className="bg-slate-950 border border-slate-805 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">🥉 3rd Place</label>
                      <input
                        type="text"
                        value={winner3}
                        onChange={(e) => setWinner3(e.target.value)}
                        placeholder="e.g. Code Ninjas"
                        className="bg-slate-950 border border-slate-805 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="self-end bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold font-outfit px-4 py-2 rounded-xl text-xs shadow-md"
                  >
                    Announce Winners
                  </button>
                </form>
              </div>

              {/* Logs */}
              <div className="border-t border-slate-800/60 pt-6">
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4">Past Broadcast Alerts</h4>
                <div className="flex flex-col gap-3">
                  {announcements.map(a => (
                    <div key={a.id} className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl flex justify-between gap-4 items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {a.category === 'winners' ? '🏆' : a.category === 'warning' ? '⚠️' : a.category === 'success' ? '🎉' : '📢'}
                        </span>
                        <div>
                          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-semibold">{a.text}</p>
                          <span className="text-[10px] text-slate-500 font-mono block mt-1">{new Date(a.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        className="text-slate-500 hover:text-danger hover:bg-slate-900 p-1.5 rounded-lg shrink-0 border border-slate-800"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* EVENT-SPECIFIC CHANNEL ANNOUNCEMENTS */}
              <div className="border-t border-slate-800/60 pt-6 flex flex-col gap-5">
                <div>
                  <h4 className="font-outfit font-black text-base text-slate-100 flex items-center gap-2">
                    <MessageSquare size={16} className="text-accent" /> Event Channel Announcements
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Post announcements to a specific event channel. Only participants registered for that event will see these messages in their "Event Channels" section.
                  </p>
                </div>

                <form onSubmit={handlePostToEventChannel} className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10.5px] font-bold text-slate-450 uppercase tracking-widest">Target Event *</label>
                      <select
                        required
                        value={channelEventId}
                        onChange={(e) => setChannelEventId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-slate-350 font-semibold"
                      >
                        <option value="">-- Choose event --</option>
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10.5px] font-bold text-slate-450 uppercase tracking-widest">Message Type</label>
                      <select
                        value={channelCategory}
                        onChange={(e) => setChannelCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-slate-350 font-semibold"
                      >
                        <option value="info">📢 General Update</option>
                        <option value="warning">⚠️ Urgent / Action Required</option>
                        <option value="success">🎉 Milestone / Achievement</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-bold text-slate-450 uppercase tracking-widest">Channel Message *</label>
                    <textarea
                      required
                      rows={3}
                      value={channelMessage}
                      onChange={(e) => setChannelMessage(e.target.value)}
                      placeholder="e.g. Reminder: Submit your project repo links by 11:59 PM tonight."
                      className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-accent/50 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="self-end bg-gradient-to-r from-accent to-primary text-white font-bold font-outfit px-4 py-2 rounded-xl text-xs shadow-md transition-all active:scale-95"
                  >
                    Post to Event Channel
                  </button>
                </form>

                {/* Recent Channel Messages Preview */}
                {channelEventId && (() => {
                  const channels = JSON.parse(localStorage.getItem('ht_event_channels')) || {};
                  const msgs = channels[channelEventId] || [];
                  const eventTitle = events.find(ev => ev.id === channelEventId)?.title || 'Event';
                  if (msgs.length === 0) return (
                    <div className="bg-slate-950/20 border border-slate-850 border-dashed rounded-xl p-6 text-center text-xs text-slate-500 italic">
                      No messages posted to "{eventTitle}" channel yet.
                    </div>
                  );
                  return (
                    <div className="flex flex-col gap-2">
                      <h5 className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Recent messages in "{eventTitle}" channel ({msgs.length})</h5>
                      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {msgs.slice(0, 10).map(m => (
                          <div key={m.id} className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl flex justify-between items-start gap-3">
                            <div className="flex items-start gap-2.5 flex-1">
                              <span className="text-sm shrink-0 mt-0.5">
                                {m.category === 'warning' ? '⚠️' : m.category === 'success' ? '🎉' : '📢'}
                              </span>
                              <div>
                                <p className="text-xs text-slate-200 leading-relaxed font-semibold">{m.text}</p>
                                <span className="text-[9px] text-slate-500 font-mono block mt-1">{m.authorName} • {new Date(m.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteChannelMessage(channelEventId, m.id)}
                              className="text-slate-600 hover:text-danger p-1 rounded shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* SECTION 8: REPORTS & ANALYTICS CHARTS */}
          {activeTab === 'reports' && (
            <div className="flex flex-col gap-6 page-enter">
              <div>
                <h3 className="font-outfit font-black text-xl text-slate-100 flex items-center gap-2">
                  <BarChart2 size={20} className="text-primary" /> Event Performance Analytics Dashboard
                </h3>
                <p className="text-xs text-slate-500 mt-1">Review event registration metrics, track story publishing metrics, and directly message event cohort participants.</p>
              </div>

              {/* Event Performance Metrics and Curves */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* SVG Curve Chart */}
                <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-outfit font-black text-slate-200 text-sm">Registrations Analytics (Daily Flow)</h4>
                    <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold">● Active Intake Flow</span>
                  </div>
                  <div className="w-full relative h-[180px] bg-slate-950/20 border border-slate-900/50 rounded-xl p-2.5 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGradPrimary" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M0 130 C 50 120, 100 80, 150 95 C 200 110, 250 50, 300 45 C 350 40, 400 20, 450 15 C 475 10, 500 5, 500 5 L 500 150 L 0 150 Z" 
                        fill="url(#chartGradPrimary)"
                      />
                      <path 
                        d="M0 130 C 50 120, 100 80, 150 95 C 200 110, 250 50, 300 45 C 350 40, 400 20, 450 15 C 475 10, 500 5, 500 5" 
                        fill="none" 
                        stroke="#8b5cf6" 
                        strokeWidth="3" 
                      />
                      <circle cx="150" cy="95" r="4" fill="#8b5cf6" stroke="#fff" strokeWidth="1" />
                      <circle cx="300" cy="45" r="4" fill="#06b6d4" stroke="#fff" strokeWidth="1" />
                      <circle cx="450" cy="15" r="4" fill="#10b981" stroke="#fff" strokeWidth="1" />
                    </svg>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mt-3 px-2">
                    <span>Mon (Intake)</span>
                    <span>Wed (Submissions)</span>
                    <span>Fri (Evaluations)</span>
                    <span>Sun (Pitching)</span>
                  </div>
                </div>

                {/* Blog engagement metrics */}
                <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="font-outfit font-black text-slate-200 text-sm mb-1.5">Stream Blog Stats</h4>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-4">Engagement tracking on participant stories.</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                        <span>Total Published Stories</span>
                        <span className="font-bold text-slate-200">{posts.length}</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, posts.length * 10)}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                        <span>Average Story Reads</span>
                        <span className="font-bold text-slate-200">{posts.length * 24} Reads</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                        <div className="bg-accent h-full rounded-full" style={{ width: `${Math.min(100, posts.length * 12 + 15)}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                        <span>Total Story Likes</span>
                        <span className="font-bold text-slate-200">{posts.length * 8} Likes</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, posts.length * 9 + 8)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-[10.5px] bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-slate-500 font-medium leading-relaxed italic">
                    ⭐ High featured blogs increase overall reader impressions by 45%.
                  </div>
                </div>
              </div>

              {/* Direct Participant messaging portal & statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start border-t border-slate-900/60 pt-6">
                {/* Left Column: Target event statistics */}
                <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4">
                  <h4 className="font-outfit font-black text-slate-200 text-sm">Domain Registrations Breakdown</h4>
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-primary" /> AI & Machine Learning</div>
                      <span className="font-bold text-slate-300">45%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-accent" /> Decentralized Web3</div>
                      <span className="font-bold text-slate-300">25%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Fullstack Applications</div>
                      <span className="font-bold text-slate-300">20%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> Cloud & DevOps</div>
                      <span className="font-bold text-slate-300">10%</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Direct Messaging Form */}
                <form onSubmit={handleSendDirectMessage} className="lg:col-span-7 bg-slate-950/40 border border-slate-900 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                    <MessageSquare size={16} className="text-primary" />
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      📩 Direct Participant Messaging Hub
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Cohort (Tech Event) *</label>
                      <select
                        required
                        value={targetEventForMsg}
                        onChange={(e) => setTargetEventForMsg(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-350 focus:outline-none focus:border-primary/50"
                      >
                        <option value="">-- Select Registered Event --</option>
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Urgency Level</label>
                      <select
                        value={directMsgUrgency}
                        onChange={(e) => setDirectMsgUrgency(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-350 focus:outline-none"
                      >
                        <option value="info">📢 Informative Announcement</option>
                        <option value="warning">⚠️ Urgent / Action Required</option>
                        <option value="success">🎉 Positive Update / Celebrate</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Direct message text *</label>
                    <textarea
                      required
                      rows={3}
                      value={directMsgText}
                      onChange={(e) => setDirectMsgText(e.target.value)}
                      placeholder="Type a cohort announcement or direct notification. It will be pushed instantly to the feeds of all developers registered for the event..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-650 focus:outline-none focus:border-primary/50 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="self-end bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white font-bold font-outfit px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Dispatch Direct Message
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SECTION 9: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6 max-w-2xl page-enter">
              <div>
                <h3 className="font-outfit font-black text-xl text-slate-100 flex items-center gap-2">
                  <Settings size={20} className="text-primary" /> Organizer Profile Settings
                </h3>
                <p className="text-xs text-slate-500 mt-1">Configure global organizer profile credentials and contact phone hotlines.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wide">Organizer Identity *</label>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wide">Department Unit *</label>
                    <input
                      type="text"
                      required
                      value={orgDept}
                      onChange={(e) => setOrgDept(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wide">Broadcast Email *</label>
                    <input
                      type="email"
                      required
                      value={orgEmail}
                      onChange={(e) => setOrgEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wide">Hotline Call *</label>
                    <input
                      type="text"
                      required
                      value={orgHotline}
                      onChange={(e) => setOrgHotline(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="self-end bg-primary hover:bg-primary/95 text-white font-bold font-outfit px-5 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
                >
                  Save Organizer Settings
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* EVENT FORM MODAL (CREATE / EDIT) — rendered via Portal */}
      {showEventModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] page-enter">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-850 flex justify-between items-center shrink-0">
              <h3 className="font-outfit font-black text-xl text-slate-100">
                {eventFormMode === 'create' ? 'Register New Tech Event' : 'Edit Event Details'}
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-slate-450 hover:text-slate-200 hover:bg-slate-850 p-1.5 rounded-lg transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEvent} className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 sm:gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">Event Name (Title) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HackTech Hackathon 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide an overview of the event, tracks, guidelines, and schedule details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">Location / Venue *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. San Francisco (or Hybrid / Remote)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">Last Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={lastDate}
                    onChange={(e) => setLastDate(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">Theme / Track *</label>
                  <input
                    type="text"
                    placeholder="e.g. AI / Machine Learning"
                    value={themeField}
                    onChange={(e) => setThemeField(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">Cash Prize / Awards *</label>
                  <input
                    type="text"
                    placeholder="e.g. $10,000 USD + Mentorship"
                    value={prizeField}
                    onChange={(e) => setPrizeField(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-slate-455 uppercase tracking-wider">Max Capacity *</label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-slate-455 uppercase tracking-wider">Max Team Size *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-slate-455 uppercase tracking-wider">Banner Image URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/banner.jpg"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-slate-455 uppercase tracking-wider">Other tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="React, Web3, Python"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-850 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-slate-450 font-semibold font-outfit border border-slate-800 rounded-xl hover:bg-slate-850 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold font-outfit text-xs text-white bg-primary hover:bg-primary/95 rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-95"
                >
                  {eventFormMode === 'create' ? 'Register Event' : 'Save Event Details'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE CONFIRMATION MODAL — rendered via Portal */}
      {deleteConfirm.show && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl p-6 flex flex-col gap-5 page-enter">
            <div className="flex flex-col gap-2 text-center">
              <span className="text-3xl">⚠️</span>
              <h3 className="font-outfit font-black text-lg text-slate-100">Delete Event?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-200">"{deleteConfirm.eventTitle}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirm({ show: false, eventId: null, eventTitle: '' })}
                className="px-5 py-2.5 text-slate-400 font-semibold font-outfit border border-slate-800 rounded-xl hover:bg-slate-850 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteEvent}
                className="px-5 py-2.5 font-semibold font-outfit text-xs text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
