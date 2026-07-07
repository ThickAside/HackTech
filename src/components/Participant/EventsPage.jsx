import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Search, Plus, MapPin, Calendar, Users, Tag, Trash2, Edit, X, Info, Check, UserPlus, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchEvents as fetchEventsFallback, saveEvent, deleteEvent, joinEvent, leaveEvent } from '../../utils/supabaseFallback';

export default function EventsPage() {
  const { userData, showToast } = useApp();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'joined', 'open'
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('all');

  const uniqueLocations = React.useMemo(() => {
    const locations = events.map(e => e.city || (e.location || '').split(',')[0].trim()).filter(Boolean);
    return ['all', ...Array.from(new Set(locations))];
  }, [events]);

  // Modal states
  const [detailEvent, setDetailEvent] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [tagsInput, setTagsInput] = useState('');
  const [date, setDate] = useState('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchEventsFallback();
      const sortedEvents = (data || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(sortedEvents);
    } catch (err) {
      showToast(err.message || 'Failed to load events.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleOpenCreateModal = () => {
    setFormMode('create');
    setTitle('');
    setDescription('');
    setLocation('');
    setMaxParticipants(100);
    setMaxTeamSize(4);
    setTagsInput('');
    // Default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().slice(0, 16));
    setShowFormModal(true);
  };

  const handleOpenEditModal = (event) => {
    setFormMode('edit');
    setSelectedEventId(event.id);
    setTitle(event.title);
    setDescription(event.description);
    setLocation(event.location);
    setMaxParticipants(event.maxParticipants);
    setMaxTeamSize(event.maxTeamSize || 4);
    setTagsInput(event.tags ? event.tags.join(', ') : '');
    // Format timestamp for datetime-local input
    if (event.date) {
      const d = new Date(event.date);
      // adjust for local timezone offset
      const tzoffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
      setDate(localISOTime);
    } else {
      setDate('');
    }
    setShowFormModal(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!title || !description || !location || !date) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t !== '');

    const eventPayload = {
      title,
      description,
      location,
      maxParticipants: parseInt(maxParticipants),
      maxTeamSize: parseInt(maxTeamSize),
      tags,
      date: new Date(date).toISOString(),
      createdBy: userData.uid,
      participants: formMode === 'create' ? [] : undefined
    };

    try {
      if (formMode === 'create') {
        await saveEvent(eventPayload, true);
        showToast('Tech event created successfully!', 'success');
      } else {
        await saveEvent(eventPayload, false, selectedEventId);
        showToast('Tech event updated successfully!', 'success');
      }
      setShowFormModal(false);
      fetchEvents();
    } catch (err) {
      showToast(err.message || 'Failed to save event.', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This action is permanent.')) return;
    try {
      await deleteEvent(eventId);
      showToast('Event deleted successfully.', 'info');
      if (detailEvent?.id === eventId) setDetailEvent(null);
      fetchEvents();
    } catch (err) {
      showToast(err.message || 'Failed to delete event.', 'error');
    }
  };

  const handleJoinLeaveEvent = async (event) => {
    const isJoined = event.participants?.includes(userData.uid);

    // Capacity guard (join only)
    if (!isJoined && (event.participants?.length || 0) >= event.maxParticipants) {
      showToast('This event has reached its maximum capacity.', 'warning');
      return;
    }

    try {
      // Call the SECURITY DEFINER RPC — works for any authenticated user
      if (isJoined) {
        await leaveEvent(event.id);
      } else {
        await joinEvent(event.id);
      }

      showToast(
        isJoined ? 'Successfully left the event.' : 'Successfully registered for the event!',
        isJoined ? 'info' : 'success'
      );

      // Optimistically update local state so the UI is instant
      const nextParticipants = isJoined
        ? (event.participants || []).filter(id => id !== userData.uid)
        : [...(event.participants || []), userData.uid];

      const updatedEvents = events.map(e =>
        e.id === event.id ? { ...e, participants: nextParticipants } : e
      );
      setEvents(updatedEvents);

      if (detailEvent?.id === event.id) {
        setDetailEvent({ ...detailEvent, participants: nextParticipants });
      }
    } catch (err) {
      showToast(err.message || 'Operation failed.', 'error');
    }
  };

  // Filter & Search Logics
  const filteredEvents = events.filter(e => {
    const title = (e.title || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    const loc = (e.location || '').toLowerCase();
    const city = (e.city || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = title.includes(q) ||
      desc.includes(q) ||
      (e.tags && e.tags.some(t => (t || '').toLowerCase().includes(q)));

    const matchesLocation = selectedLocationFilter === 'all' ||
      city === selectedLocationFilter.toLowerCase() ||
      loc.includes(selectedLocationFilter.toLowerCase());

    const isJoined = e.participants?.includes(userData.uid);

    const matchesFilters = matchesSearch && matchesLocation;

    if (filterTab === 'joined') return matchesFilters && isJoined;
    if (filterTab === 'open') return matchesFilters && !isJoined && (!e.participants || e.participants.length < e.maxParticipants);
    return matchesFilters;
  });

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(isoString).toLocaleDateString('en-US', options);
  };

  return (
    <div id="page-events" className="page-enter">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-outfit font-black text-3xl text-slate-100 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block">
            Tech Events & Hackathons
          </h1>
          <p className="text-[14.5px] text-slate-450 mt-1">
            Browse active tech hackathons, challenges, and coding marathons. Register to join teams.
          </p>
        </div>

        {userData.role === 'admin' && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white font-semibold font-outfit px-5 py-2.5 rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-95 shrink-0 text-sm"
          >
            <Plus size={18} /> Create Event
          </button>
        )}
      </div>

      {/* Filters & Searching Panel */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 mb-8 flex flex-col md:flex-row items-center gap-4">
        {/* Tab filters */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl w-full md:w-auto shrink-0 border border-slate-900">
          <button
            onClick={() => setFilterTab('all')}
            className={`flex-1 md:flex-initial text-xs md:text-sm font-semibold px-4 py-2 rounded-lg transition-all ${filterTab === 'all' ? 'bg-primary/10 text-primary border border-primary/15 shadow-sm shadow-primary/5' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilterTab('joined')}
            className={`flex-1 md:flex-initial text-xs md:text-sm font-semibold px-4 py-2 rounded-lg transition-all ${filterTab === 'joined' ? 'bg-primary/10 text-primary border border-primary/15 shadow-sm shadow-primary/5' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
          >
            Registered
          </button>
          <button
            onClick={() => setFilterTab('open')}
            className={`flex-1 md:flex-initial text-xs md:text-sm font-semibold px-4 py-2 rounded-lg transition-all ${filterTab === 'open' ? 'bg-primary/10 text-primary border border-primary/15 shadow-sm shadow-primary/5' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
          >
            Available
          </button>
        </div>

        {/* Searching Input */}
        <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-505" size={18} />
          <input
            type="text"
            placeholder="Search by title, info, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-[14.5px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/45 transition-colors shadow-sm"
          />
        </div>

        {/* Location Filters Dropdown */}
        <div className="w-full md:w-48 shrink-0 flex flex-col gap-1">
          <select
            value={selectedLocationFilter}
            onChange={(e) => setSelectedLocationFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-400 focus:outline-none focus:border-primary/50 shadow-sm"
          >
            <option value="all">📍 All Locations</option>
            {uniqueLocations.filter(loc => loc !== 'all').map((loc, idx) => (
              <option key={idx} value={loc} className="bg-slate-950 text-slate-200">
                {loc.charAt(0).toUpperCase() + loc.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchEvents}
          title="Refresh events"
          className="shrink-0 p-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-primary hover:border-primary/40 transition-all active:scale-95"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {/* Events Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="spinner border-4 border-slate-800 border-t-primary w-10 h-10 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-550">Retrieving Hackathons...</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center">
          <span className="text-4xl">🛸</span>
          <h3 className="font-outfit font-extrabold text-lg text-slate-200 mt-4">No Events Found</h3>
          <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
            We couldn't find any events matching your filter selections. Check back later or create a new one!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredEvents.map(event => {
            const isJoined = event.participants?.includes(userData.uid);
            const partCount = event.participants?.length || 0;
            const pctFull = Math.min(100, Math.round((partCount / event.maxParticipants) * 100));

            // Load bannerUrl from event object first (local events), then ht_events_extra (DB events)
            const extras = JSON.parse(localStorage.getItem('ht_events_extra')) || {};
            const banner = event.bannerUrl || extras[event.id]?.bannerUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200';

            return (
              <div
                key={event.id}
                className="bg-slate-900/45 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/35 transition-all flex flex-col group justify-between"
              >
                {/* Event Banner Image Header */}
                <div className="h-44 w-full relative overflow-hidden shrink-0">
                  <img
                    src={banner}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent pointer-events-none" />
                </div>

                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">
                        📍 {event.city || event.location.split(',')[0]}
                      </span>

                      {isJoined && (
                        <span className="text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-[5px] flex items-center gap-1 shrink-0 animate-pulse">
                          <Check size={10} /> REGISTERED
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => setDetailEvent(event)}
                      className="font-outfit font-black text-xl text-slate-100 leading-snug group-hover:text-primary transition-colors cursor-pointer mb-2 line-clamp-1"
                    >
                      {event.title}
                    </h3>

                    <p className="text-xs text-slate-455 font-semibold flex flex-wrap items-center gap-1.5 mb-4">
                      <Calendar size={13} className="text-primary" /> 
                      {(() => {
                        const extras = JSON.parse(localStorage.getItem('ht_events_extra')) || {};
                        const lastDateVal = event.lastDate || extras[event.id]?.lastDate;
                        return `${formatDate(event.date)}${lastDateVal ? ` - ${formatDate(lastDateVal)}` : ''}`;
                      })()}
                    </p>

                    <p className="text-slate-400 text-[13.5px] mb-4 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  <div>
                    {/* Progress capacity meter */}
                    <div className="mb-5 bg-slate-950/40 border border-slate-800/40 p-3 rounded-xl">
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mb-1.5">
                        <span className="flex items-center gap-1"><Users size={12} /> Capacity</span>
                        <span>{partCount} / {event.maxParticipants} ({pctFull}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${pctFull > 85 ? 'bg-danger' : pctFull > 50 ? 'bg-primary' : 'bg-accent'}`}
                          style={{ width: `${pctFull}%` }}
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    {event.tags && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {event.tags.map((tag, idx) => (
                          <span key={idx} className="text-[11px] font-semibold text-slate-300 bg-slate-850 border border-slate-700/60 px-2 py-0.5 rounded-[6px]">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-800/60 mt-auto">
                      <button
                        onClick={() => setDetailEvent(event)}
                        className="flex-1 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold font-outfit text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Info size={13} /> Details
                      </button>

                      <button
                        onClick={() => handleJoinLeaveEvent(event)}
                        className={`flex-1 font-semibold font-outfit text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${isJoined
                            ? 'bg-slate-850 hover:bg-slate-800 text-slate-300'
                            : 'bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white text-primary'
                          }`}
                      >
                        {isJoined ? 'Leave' : 'Join Event'}
                      </button>

                      {userData.role === 'admin' && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditModal(event)}
                            className="text-slate-500 hover:text-primary hover:bg-slate-900 p-2 rounded-lg transition-colors cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-slate-500 hover:text-danger hover:bg-slate-900 p-2 rounded-lg transition-colors cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {detailEvent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] page-enter">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800/80 flex justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">
                  📌 {detailEvent.location}
                </span>
                <h2 className="font-outfit font-black text-2xl text-slate-100 mt-1 leading-snug">
                  {detailEvent.title}
                </h2>
              </div>
              <button
                onClick={() => setDetailEvent(null)}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-850 p-1.5 rounded-lg transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4 sm:gap-5">
              {(() => {
                const results = JSON.parse(localStorage.getItem('ht_results')) || {};
                const eventResults = results[detailEvent.id];
                const resources = JSON.parse(localStorage.getItem('ht_resources')) || [];

                return (
                  <>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                      <p className="text-slate-350 text-[14px] leading-relaxed whitespace-pre-line">
                        {detailEvent.description}
                      </p>
                    </div>

                    {eventResults && (
                      <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">🎉 Hackathon Results & Showcase</h4>
                        <div className="grid grid-cols-3 gap-2.5 text-center mt-1">
                          <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                            <span className="text-lg block">🥇</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">1st Place</span>
                            <span className="text-xs font-bold text-slate-200 block mt-0.5">{eventResults.first}</span>
                          </div>
                          <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                            <span className="text-lg block">🥈</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">2nd Place</span>
                            <span className="text-xs font-bold text-slate-200 block mt-0.5">{eventResults.second}</span>
                          </div>
                          <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                            <span className="text-lg block">🥉</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">3rd Place</span>
                            <span className="text-xs font-bold text-slate-200 block mt-0.5">{eventResults.third}</span>
                          </div>
                        </div>
                        {eventResults.showcase && (
                          <div className="mt-2 text-xs text-slate-400 font-medium">
                            <span className="text-slate-300 font-bold block mb-0.5">Top Showcase Projects:</span>
                            <code className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/60 block whitespace-pre-wrap">{eventResults.showcase}</code>
                          </div>
                        )}
                      </div>
                    )}

                    {resources.length > 0 && (
                      <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-widest">📄 Downloadable Event Materials & Guidelines</h4>
                        <div className="flex flex-col gap-2 mt-1">
                          {resources.map(res => (
                            <div key={res.id} className="bg-slate-950/60 border border-slate-900/60 p-2.5 rounded-lg flex justify-between items-center text-xs">
                              <div>
                                <span className="text-[9px] font-bold text-accent bg-accent/10 border border-accent/25 px-1.5 py-0.5 rounded mr-2">{res.type}</span>
                                <span className="font-bold text-slate-200">{res.title}</span>
                              </div>
                              <span className="font-mono text-[10px] text-slate-450 truncate max-w-[200px]">{res.content}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 border border-slate-900/60 p-4 rounded-xl">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase mb-1">Date & Time</h4>
                  <p className="text-xs font-bold text-slate-300 flex flex-wrap items-center gap-1">
                    <Calendar size={12} className="text-primary" /> 
                    {(() => {
                      const extras = JSON.parse(localStorage.getItem('ht_events_extra')) || {};
                      const lastDateVal = detailEvent.lastDate || extras[detailEvent.id]?.lastDate;
                      return `${formatDate(detailEvent.date)}${lastDateVal ? ` - ${formatDate(lastDateVal)}` : ''}`;
                    })()}
                  </p>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase mb-1">Max Team Size</h4>
                  <p className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Users size={12} className="text-accent" /> {detailEvent.maxTeamSize || 4} Members Max
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Registered Participants ({detailEvent.participants?.length || 0} / {detailEvent.maxParticipants})
                </h4>

                {/* ProgressBar */}
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round(((detailEvent.participants?.length || 0) / detailEvent.maxParticipants) * 100))}%` }}
                  />
                </div>

                <div className="text-xs text-slate-500 italic">
                  Join the event to coordinate inside the "My Teams" hub.
                </div>
              </div>

              {detailEvent.tags && detailEvent.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detailEvent.tags.map((tag, idx) => (
                      <span key={idx} className="text-[11px] font-semibold text-slate-300 bg-slate-850 border border-slate-700/60 px-2.5 py-0.5 rounded-[6px]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 bg-slate-950/40 border-t border-slate-850 flex justify-between gap-3 items-center">
              <span className="text-xs text-slate-500">
                Created by {detailEvent.createdBy === userData.uid ? 'You' : 'an Admin'}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => setDetailEvent(null)}
                  className="px-4 py-2 text-slate-400 font-semibold font-outfit border border-slate-800 rounded-xl hover:bg-slate-850 text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleJoinLeaveEvent(detailEvent)}
                  className={`px-5 py-2 font-semibold font-outfit text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95 ${detailEvent.participants?.includes(userData.uid)
                      ? 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                      : 'bg-primary hover:bg-primary/95 text-white'
                    }`}
                >
                  {detailEvent.participants?.includes(userData.uid) ? 'Leave Event' : 'Register Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE & EDIT FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] page-enter">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-850 flex justify-between items-center">
              <h3 className="font-outfit font-black text-xl text-slate-100">
                {formMode === 'create' ? 'Create Tech Event' : 'Edit Tech Event'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-450 hover:text-slate-200 hover:bg-slate-850 p-1.5 rounded-lg transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEvent} className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 sm:gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cyber Security Summit 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize objectives, prizes, and coding topics..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 focus:ring-4 focus:ring-primary/10 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">Location / Venue *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. San Francisco or Hybrid"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 focus:ring-4 focus:ring-primary/10 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-slate-455 uppercase tracking-wider">Max Participants *</label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 focus:ring-4 focus:ring-primary/10 font-mono"
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
                    className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 focus:ring-4 focus:ring-primary/10 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-slate-455 uppercase tracking-wider">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. AI, React, Web3, Hackathon"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 focus:ring-4 focus:ring-primary/10"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-850 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-slate-400 font-semibold font-outfit border border-slate-800 rounded-xl hover:bg-slate-850 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold font-outfit text-xs text-white bg-primary hover:bg-primary/95 rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-95"
                >
                  {formMode === 'create' ? 'Create Event' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
