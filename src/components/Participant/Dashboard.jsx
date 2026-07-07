import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { 
  Calendar, Users, MapPin, ArrowRight, 
  Bell, MessageSquare, Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchEvents, saveEvent, fetchTeams, fetchPosts, joinEvent, leaveEvent } from '../../utils/supabaseFallback';
import welcomeImg from '../welcome.jpg';

export default function Dashboard() {
  const { userData, showToast } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ events: 0, teams: 0, blog: 0, joined: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [latestStory, setLatestStory] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardDetails = async () => {
    if (!userData) return;
    try {
      setLoading(true);

      const evsData = await fetchEvents();
      const evs = (evsData || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      setAllEvents(evs || []);

      const userJoinedEvents = (evs || []).filter(e => e.participants?.includes(userData.uid));
      setRegisteredEvents(userJoinedEvents);

      let teamsCount = 0;
      try {
        const allTeams = await fetchTeams();
        teamsCount = (allTeams || []).filter(t => t.members?.includes(userData.uid)).length;
      } catch (e) {
        console.warn('Teams table not available:', e.message);
      }

      let postsData = [];
      try {
        const fetchedPosts = await fetchPosts();
        postsData = (fetchedPosts || []).sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
      } catch (e) {
        console.warn('Posts table not available:', e.message);
      }

      if (postsData.length > 0) setLatestStory(postsData[0]);

      setStats({
        events: evs?.length || 0,
        teams: teamsCount,
        blog: postsData.length,
        joined: userJoinedEvents.length
      });

      const anns = JSON.parse(localStorage.getItem('ht_announcements')) || [];
      setAnnouncements(anns.slice(0, 4));
    } catch (err) {
      console.error('Failed to hydrate participant dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardDetails(); }, [userData]);

  const handleToggleJoinEvent = async (event) => {
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
      fetchDashboardDetails();
    } catch (err) {
      showToast(err.message || 'Operation failed.', 'error');
    }
  };

  const upcomingEvents = allEvents
    .filter(e => new Date(e.date) > new Date())
    .slice(0, 3);

  const getEventDateRange = (ev) => {
    const start = new Date(ev.date).toLocaleDateString();
    const extras = JSON.parse(localStorage.getItem('ht_events_extra')) || {};
    const lastDateVal = ev.lastDate || extras[ev.id]?.lastDate;
    return lastDateVal ? `${start} - ${new Date(lastDateVal).toLocaleDateString()}` : start;
  };

  return (
    <div id="page-dashboard" className="page-enter flex flex-col gap-6 w-full">
      {/* ── WELCOME BANNER ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 bg-slate-900/40 border border-slate-850 rounded-2xl shadow-sm overflow-hidden relative">
        <div className="absolute -top-[50px] right-[50px] w-[200px] h-[200px] rounded-full pointer-events-none bg-primary/5 blur-3xl z-0" />

        <div className="md:col-span-3 h-full min-h-[150px] relative overflow-hidden">
          <img src={welcomeImg} alt="Collaborating developers banner" className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/30 pointer-events-none" />
        </div>

        <div className="md:col-span-9 p-6 sm:p-8 flex flex-col justify-center z-10 relative">
          <h2 className="font-outfit font-black text-2xl sm:text-3xl text-slate-100 mb-1.5 leading-tight">
            Welcome back, <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{userData.name ? userData.name.split(' ')[0] : 'Innovator'}</span> 👋
          </h2>
          <p className="text-xs sm:text-sm md:text-base leading-relaxed text-slate-350 max-w-2xl">
            Your personal command center — discover hackathons, track registrations, and assemble your dream team.
          </p>
          <div className="flex gap-3 mt-4 flex-wrap">
            <button onClick={() => navigate('/dashboard/participant/events')} className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-white font-bold font-outfit text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer">
              Discover Hackathons <ArrowRight size={13} />
            </button>
            <button onClick={() => navigate('/dashboard/participant/teams')} className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 font-bold font-outfit text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer">
              My Teams
            </button>
            <button onClick={() => navigate('/dashboard/participant/blog')} className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 font-bold font-outfit text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer">
              Blog Feed
            </button>
            <button onClick={() => navigate('/dashboard/participant/profile')} className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 font-bold font-outfit text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer">
              My Profile
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="spinner border-4 border-slate-800 border-t-primary w-10 h-10 rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-500">Syncing dashboard hub...</span>
        </div>
      ) : (
        <>
          {/* ── STATS CARDS (display only, no click) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:border-primary/40 transition-all duration-300">
              <span className="text-2xl block">📅</span>
              <div className="font-outfit font-black text-2xl sm:text-3xl text-slate-100 mt-2">{stats.events}</div>
              <div className="text-[11px] sm:text-xs text-slate-450 font-bold uppercase tracking-wider mt-1">Total Hackathons</div>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:border-accent/40 transition-all duration-300">
              <span className="text-2xl block">🤝</span>
              <div className="font-outfit font-black text-2xl sm:text-3xl text-slate-100 mt-2">{stats.joined}</div>
              <div className="text-[11px] sm:text-xs text-slate-450 font-bold uppercase tracking-wider mt-1">Registered Events</div>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:border-emerald-500/30 transition-all duration-300">
              <span className="text-2xl block">👥</span>
              <div className="font-outfit font-black text-2xl sm:text-3xl text-slate-100 mt-2">{stats.teams}</div>
              <div className="text-[11px] sm:text-xs text-slate-450 font-bold uppercase tracking-wider mt-1">My Teams</div>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:border-purple-500/30 transition-all duration-300">
              <span className="text-2xl block">📝</span>
              <div className="font-outfit font-black text-2xl sm:text-3xl text-slate-100 mt-2">{stats.blog}</div>
              <div className="text-[11px] sm:text-xs text-slate-450 font-bold uppercase tracking-wider mt-1">Blog Posts</div>
            </div>
          </div>

          {/* ── TWO-COLUMN LAYOUT ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT: Events */}
            <div className="lg:col-span-7 flex flex-col gap-6">

              {/* MY REGISTERED EVENTS */}
              <div className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <h3 className="font-outfit font-extrabold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full cyber-pulse-indicator"></span>
                    My Registered Events
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded">
                    {registeredEvents.length} Joined
                  </span>
                </div>

                {registeredEvents.length === 0 ? (
                  <div className="bg-slate-950/20 border border-slate-850 border-dashed rounded-xl p-8 text-center flex flex-col items-center">
                    <span className="text-3xl block mb-2 opacity-50">🧭</span>
                    <p className="text-xs text-slate-450 font-medium">You haven't registered for any events yet.</p>
                    <button onClick={() => navigate('/dashboard/participant/events')} className="text-xs text-primary font-bold hover:underline mt-2 flex items-center gap-1 cursor-pointer">
                      Browse Hackathons <ArrowRight size={11} />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {registeredEvents.map(ev => (
                      <div key={ev.id} className="bg-slate-950/40 border border-slate-850 hover:border-primary/30 p-4 rounded-xl flex flex-col justify-between transition-colors shadow-sm group">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-slate-200 text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors">{ev.title}</h4>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 uppercase tracking-wider shrink-0">Registered</span>
                          </div>
                          <p className="text-[10px] text-slate-450 line-clamp-2 mt-1.5 leading-relaxed">{ev.description}</p>
                          <div className="text-[10px] text-slate-500 font-semibold font-mono mt-3 flex flex-col gap-1">
                            <span className="flex items-center gap-1"><Calendar size={11} /> {getEventDateRange(ev)}</span>
                            <span className="flex items-center gap-1"><MapPin size={11} /> {ev.city || ev.location?.split(',')[0] || ev.location}</span>
                          </div>
                        </div>
                        <div className="border-t border-slate-850/60 mt-3 pt-3 flex justify-between items-center text-[10.5px]">
                          <span className="text-slate-500 font-semibold">{ev.participants?.length || 0}/{ev.maxParticipants} spots</span>
                          <button onClick={() => handleToggleJoinEvent(ev)} className="text-danger hover:underline font-bold flex items-center gap-0.5 cursor-pointer text-[10px]">
                            Leave Event
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* UPCOMING EVENTS */}
              <div className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <h3 className="font-outfit font-extrabold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-primary rounded-full cyber-pulse-indicator"></span>
                    Upcoming Events
                  </h3>
                  <button onClick={() => navigate('/dashboard/participant/events')} className="text-xs text-primary font-bold hover:underline cursor-pointer">
                    View All
                  </button>
                </div>

                <div className="flex flex-col gap-3.5">
                  {upcomingEvents.length === 0 ? (
                    <div className="bg-slate-950/20 border border-slate-850 border-dashed rounded-xl p-6 text-center text-xs text-slate-500 italic">
                      No upcoming hackathons scheduled yet.
                    </div>
                  ) : (
                    upcomingEvents.map(ev => {
                      const isJoined = ev.participants?.includes(userData.uid);
                      return (
                        <div key={ev.id} className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:bg-slate-950/60 shadow-sm">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-200 text-sm">{ev.title}</h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-450 mt-1.5 font-medium">
                              <span className="flex items-center gap-1 text-[11px]"><MapPin size={11} className="text-accent" /> {ev.location}</span>
                              <span className="flex items-center gap-1 text-[11px]"><Calendar size={11} className="text-primary" /> {getEventDateRange(ev)}</span>
                              <span className="flex items-center gap-1 text-[11px]"><Users size={11} className="text-slate-500" /> {ev.participants?.length || 0}/{ev.maxParticipants}</span>
                            </div>
                            {ev.tags && ev.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {ev.tags.map((tag, idx) => (
                                  <span key={idx} className="text-[9px] bg-slate-950 border border-slate-850 text-slate-450 px-1.5 py-0.5 rounded font-mono font-bold">#{tag.trim()}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 self-end sm:self-center">
                            {isJoined ? (
                              <button onClick={() => handleToggleJoinEvent(ev)} className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-danger/10 border border-emerald-500/20 hover:border-danger/30 text-emerald-500 hover:text-danger font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer group">
                                <span className="group-hover:hidden">Registered ✓</span>
                                <span className="hidden group-hover:inline">Leave Event</span>
                              </button>
                            ) : (
                              <button onClick={() => handleToggleJoinEvent(ev)} className="flex items-center gap-1 bg-primary hover:bg-primary/95 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer">
                                <Plus size={13} /> Join Event
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-5 flex flex-col gap-6">

              {/* ANNOUNCEMENTS */}
              <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <h3 className="font-outfit font-extrabold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                    <Bell size={16} className="text-primary" />
                    Broadcasts & Alerts
                  </h3>
                  {announcements.length > 0 && (
                    <span className="text-[9px] font-bold text-slate-500 animate-pulse font-mono uppercase bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">Live</span>
                  )}
                </div>

                {announcements.length === 0 ? (
                  <div className="bg-slate-950/20 border border-slate-850 border-dashed rounded-xl p-6 text-center text-xs text-slate-500 italic">
                    No global broadcasts active today. Enjoy compiling! 💻
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1">
                    {announcements.map(a => (
                      <div key={a.id} className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-start gap-3">
                        <span className="text-lg shrink-0 mt-0.5">
                          {a.category === 'warning' ? '⚠️' : a.category === 'success' ? '🎉' : '📢'}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center gap-2">
                            <span className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              a.category === 'warning' ? 'bg-red-500/10 border-red-500/20 text-red-500'
                              : a.category === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                              : 'bg-primary/10 border-primary/20 text-primary'
                            }`}>
                              {a.category === 'warning' ? 'Alert' : a.category === 'success' ? 'Update' : 'Info'}
                            </span>
                            <span className="text-[8.5px] text-slate-500 font-semibold font-mono">{new Date(a.created_at || a.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-350 leading-relaxed font-semibold mt-1.5">{a.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LATEST BLOG TEASER */}
              <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="font-outfit font-extrabold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                  <MessageSquare size={16} className="text-primary" />
                  Community Highlights
                </h3>

                {!latestStory ? (
                  <div className="bg-slate-950/20 border border-slate-850 border-dashed rounded-xl p-4 text-center text-xs text-slate-500 italic">
                    No developer experiences published yet.
                  </div>
                ) : (
                  <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[9px] font-bold text-accent bg-accent/5 border border-accent/20 px-2 py-0.5 rounded uppercase">Latest</span>
                        <span className="text-[9px] text-slate-500 font-mono font-semibold">{new Date(latestStory.created_at || latestStory.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-bold text-slate-200 mt-2 text-xs sm:text-sm line-clamp-1">{latestStory.title}</h4>
                      <p className="text-xs text-slate-450 line-clamp-2 mt-1.5 leading-relaxed">{latestStory.body}</p>
                    </div>
                    <div className="border-t border-slate-850/50 mt-3.5 pt-2.5 flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-semibold font-mono">By {latestStory.authorName}</span>
                      <button onClick={() => navigate('/dashboard/participant/blog')} className="text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer">
                        Read More <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
