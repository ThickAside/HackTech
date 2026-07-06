import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { fetchEvents } from '../../utils/supabaseFallback';
import { Megaphone, ChevronRight, ArrowLeft, Calendar, MapPin, RefreshCw } from 'lucide-react';

export default function EventChannelPage() {
  const { userData } = useApp();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const allEvents = await fetchEvents();
        // Only show events the user is registered for
        const userEvents = (allEvents || []).filter(e => e.participants?.includes(userData?.uid));
        setEvents(userEvents);
      } catch (err) {
        console.error('Failed to load events for channels:', err);
      } finally {
        setLoading(false);
      }
    };
    if (userData?.uid) load();
  }, [userData]);

  const getChannelMessages = (eventId) => {
    try {
      const channels = JSON.parse(localStorage.getItem('ht_event_channels')) || {};
      return channels[eventId] || [];
    } catch {
      return [];
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const messages = selectedEventId ? getChannelMessages(selectedEventId) : [];

  // Count total unread-style messages per event
  const getMessageCount = (eventId) => {
    try {
      const channels = JSON.parse(localStorage.getItem('ht_event_channels')) || {};
      return (channels[eventId] || []).length;
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="page-enter flex flex-col items-center justify-center py-20 gap-3">
        <div className="spinner border-4 border-slate-800 border-t-primary w-10 h-10 rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-500">Loading event channels...</span>
      </div>
    );
  }

  // Channel Feed View (selected event)
  if (selectedEventId && selectedEvent) {
    return (
      <div id="page-channels" className="page-enter max-w-3xl mx-auto">
        <button
          onClick={() => setSelectedEventId(null)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-primary mb-5 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Channels
        </button>

        {/* Channel Header */}
        <div className="bg-slate-900/45 border border-slate-800/80 rounded-2xl p-5 sm:p-6 mb-6 relative overflow-hidden">
          <div className="absolute -top-[60px] -right-[60px] w-[160px] h-[160px] rounded-full pointer-events-none bg-accent/5 blur-2xl" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-lg shrink-0">
              <Megaphone size={22} />
            </div>
            <div className="flex-1">
              <h2 className="font-outfit font-black text-lg sm:text-xl text-slate-100 leading-tight">
                {selectedEvent.title}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-450 mt-1.5 font-medium">
                <span className="flex items-center gap-1"><MapPin size={11} className="text-accent" /> {selectedEvent.location}</span>
                <span className="flex items-center gap-1"><Calendar size={11} className="text-primary" /> {new Date(selectedEvent.date).toLocaleDateString()}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Organiser announcements for this event appear here in real-time.</p>
            </div>
          </div>
        </div>

        {/* Messages Feed */}
        {messages.length === 0 ? (
          <div className="bg-slate-900/25 border border-slate-850 border-dashed rounded-2xl p-12 text-center flex flex-col items-center gap-3">
            <span className="text-3xl opacity-50">📭</span>
            <p className="text-xs text-slate-500 font-medium">No announcements yet from the event organiser.</p>
            <p className="text-[10px] text-slate-600">Check back later for updates, schedule changes, and important notices.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">{messages.length} Announcement{messages.length !== 1 ? 's' : ''}</span>
              <button
                onClick={() => setSelectedEventId(selectedEventId)} // Force re-render
                className="text-[10px] text-slate-500 hover:text-primary font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={10} /> Refresh
              </button>
            </div>
            {messages.map(m => (
              <div
                key={m.id}
                className="bg-slate-900/45 border border-slate-800/80 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 shadow-sm hover:border-slate-700/80 transition-colors"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                  m.category === 'warning' ? 'bg-red-500/10 border border-red-500/20' :
                  m.category === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  'bg-primary/10 border border-primary/20'
                }`}>
                  {m.category === 'warning' ? '⚠️' : m.category === 'success' ? '🎉' : '📢'}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center gap-3 mb-1.5">
                    <span className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      m.category === 'warning' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                      m.category === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                      'bg-primary/10 border-primary/20 text-primary'
                    }`}>
                      {m.category === 'warning' ? 'Urgent' : m.category === 'success' ? 'Update' : 'Info'}
                    </span>
                    <span className="text-[9px] text-slate-550 font-mono font-semibold">
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-semibold">{m.text}</p>
                  <span className="text-[10px] text-slate-500 font-semibold mt-2 block">
                    — {m.authorName || 'Organiser'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Channel List View
  return (
    <div id="page-channels" className="page-enter max-w-3xl mx-auto">
      <h1 className="font-outfit font-black text-2xl sm:text-3xl text-slate-100 mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block">
        Event Channels
      </h1>
      <p className="text-xs sm:text-sm text-slate-450 mb-6 sm:mb-8 leading-relaxed max-w-xl">
        View announcements from organisers for events you've registered for. Stay updated with schedule changes, deadlines, and important notices.
      </p>

      {events.length === 0 ? (
        <div className="bg-slate-900/25 border border-slate-850 border-dashed rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <span className="text-4xl opacity-50">📡</span>
          <p className="text-sm text-slate-400 font-semibold">No Event Channels</p>
          <p className="text-xs text-slate-500 max-w-sm">
            You haven't joined any events yet. Register for events to see their announcement channels here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map(ev => {
            const msgCount = getMessageCount(ev.id);
            const extras = JSON.parse(localStorage.getItem('ht_events_extra')) || {};
            const lastDateVal = ev.lastDate || extras[ev.id]?.lastDate;

            return (
              <button
                key={ev.id}
                onClick={() => setSelectedEventId(ev.id)}
                className="w-full bg-slate-900/45 border border-slate-800/80 hover:border-primary/30 p-4 sm:p-5 rounded-2xl flex items-center gap-4 transition-all hover:bg-slate-900/60 shadow-sm group cursor-pointer text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center text-white shrink-0 shadow-md shadow-primary/10">
                  <Megaphone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-outfit font-bold text-sm text-slate-100 truncate group-hover:text-primary transition-colors">
                    {ev.title}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-slate-500 mt-1 font-medium">
                    <span className="flex items-center gap-1"><MapPin size={10} /> {ev.location}</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> {new Date(ev.date).toLocaleDateString()}
                      {lastDateVal ? ` - ${new Date(lastDateVal).toLocaleDateString()}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {msgCount > 0 && (
                    <span className="text-[10px] font-bold bg-primary/15 border border-primary/25 text-primary px-2 py-0.5 rounded-full">
                      {msgCount} msg{msgCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-primary transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
