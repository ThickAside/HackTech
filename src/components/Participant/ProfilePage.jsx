import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Mail, Calendar, User, Award, ShieldAlert, BadgeInfo, Terminal, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchEvents, fetchTeams, fetchPosts, saveProfile } from '../../utils/supabaseFallback';

export default function ProfilePage() {
  const { userData } = useApp();
  const [profileStats, setProfileStats] = useState({
    eventsJoined: 0,
    teamsCount: 0,
    postsCreated: 0
  });
  const [loading, setLoading] = useState(true);

  // Matchmaking extra states
  const [userLocation, setUserLocation] = useState('');
  const [userSkills, setUserSkills] = useState('');
  const [userInterests, setUserInterests] = useState('');
  const [userGithub, setUserGithub] = useState('');
  const [userLinkedin, setUserLinkedin] = useState('');

  useEffect(() => {
    if (userData?.uid) {
      try {
        const extra = JSON.parse(localStorage.getItem('ht_users_extra')) || {};
        const userExtra = extra[userData.uid] || { skills: '', location: '', interests: '', github: '', linkedin: '' };
        setUserLocation(userExtra.location || '');
        setUserSkills(userExtra.skills || '');
        setUserInterests(userExtra.interests || '');
        setUserGithub(userExtra.github || '');
        setUserLinkedin(userExtra.linkedin || '');
      } catch (err) { }
    }
  }, [userData]);

  const handleSaveDeveloperProfile = async (e) => {
    e.preventDefault();
    if (!userData?.uid) return;
    try {
      await saveProfile({
        skills: userSkills.trim(),
        location: userLocation.trim(),
        interests: userInterests.trim(),
        github: userGithub.trim(),
        linkedin: userLinkedin.trim()
      }, false, userData.uid);
      alert('Profile details updated successfully! Teammate matches will sync.');
    } catch (err) {
      alert('Failed to save details.');
    }
  };

  useEffect(() => {
    const loadProfileStats = async () => {
      try {
        setLoading(true);

        // Fetch Joined Events
        const eventsData = await fetchEvents();
        const eventsCount = (eventsData || []).filter(e => e.participants?.includes(userData.uid)).length;

        // Fetch Joined/Created Teams
        const teamsData = await fetchTeams();
        const teamsCount = (teamsData || []).filter(t => t.members?.includes(userData.uid)).length;

        // Fetch Blog posts
        const postsData = await fetchPosts();
        const postsCount = (postsData || []).filter(p => p.authorId === userData.uid).length;

        setProfileStats({
          eventsJoined: eventsCount,
          teamsCount: teamsCount,
          postsCreated: postsCount
        });
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    if (userData?.uid) {
      loadProfileStats();
    }
  }, [userData]);

  const initials = userData?.name
    ? userData.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : userData?.email?.split('@')[0].substring(0, 2).toUpperCase() || 'U';

  const registrationDate = (userData?.created_at || userData?.createdAt)
    ? new Date(userData.created_at || userData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  // Badges logic based on accomplishments
  const badges = [
    {
      id: 'active-coder',
      title: 'Active Coder',
      description: 'Joined at least 1 tech event',
      unlocked: profileStats.eventsJoined > 0,
      icon: '🚀'
    },
    {
      id: 'team-player',
      title: 'Squad Pioneer',
      description: 'Member of a hackathon squad',
      unlocked: profileStats.teamsCount > 0,
      icon: '🤝'
    },
    {
      id: 'storyteller',
      title: 'Tech Speaker',
      description: 'Published a tech stream story',
      unlocked: profileStats.postsCreated > 0,
      icon: '✍️'
    },
    {
      id: 'admin-key',
      title: 'Security Admin',
      description: 'Has system administration keys',
      unlocked: userData?.role === 'admin',
      icon: '🛡️'
    }
  ];

  return (
    <div id="page-profile" className="page-enter max-w-4xl mx-auto">
      <h1 className="font-outfit font-black text-2xl sm:text-3xl text-slate-100 mb-6 sm:mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block">
        Profile
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
        {/* Profile Identity Card */}
        <div className="md:col-span-5 bg-slate-900/45 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -top-[100px] -right-[100px] w-[200px] h-[200px] rounded-full pointer-events-none bg-primary/5 blur-xl" />

          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl sm:text-3xl font-outfit font-black mb-3.5 sm:mb-4 shadow-lg shadow-primary/15">
            {initials}
          </div>

           <h2 className="font-outfit font-black text-xl sm:text-2xl text-slate-100 leading-snug">
            {userData?.name || ''}
          </h2>

          <span className={`text-[10px] font-bold font-mono tracking-wider px-2.5 py-0.5 sm:py-1 rounded-[6px] mt-2 uppercase border ${userData?.role === 'admin'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
              : 'bg-primary/10 border-primary/20 text-primary'
            }`}>
            {userData?.role || 'participant'}
          </span>

          <div className="w-full border-t border-slate-800/60 my-6 pt-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-slate-400 text-sm text-left">
              <Mail size={16} className="text-primary shrink-0" />
              <span className="truncate flex-1">{userData?.email}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-400 text-sm text-left">
              <Calendar size={16} className="text-accent shrink-0" />
              <span>Registered {registrationDate}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-400 text-sm text-left">
              <Terminal size={16} className="text-slate-500 shrink-0" />
              <span>ID: <code className="font-mono text-xs text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/60">{userData?.uid?.slice(0, 8)}...</code></span>
            </div>

            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                // 1. Clear local session cache immediately
                localStorage.clear();

                // 2. Perform Supabase server signOut with a timeout race to let the browser dispatch it
                try {
                  const signOutPromise = supabase.auth.signOut();
                  const timeoutPromise = new Promise(resolve => setTimeout(resolve, 800));
                  await Promise.race([signOutPromise, timeoutPromise]);
                } catch (err) {
                  console.warn("Sign out failed on server or timed out:", err);
                }

                // 3. Force clean window refresh
                window.location.reload();
              }}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold font-outfit py-3 px-4 rounded-xl shadow-sm transition-all active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
            >
              <LogOut size={14} className="text-slate-400" /> Sign Out
            </button>
          </div>
        </div>

        {/* Stats & Badge Vault */}
        <div className="md:col-span-7 flex flex-col gap-6">
          {/* Developer Profile Customization */}
          <div className="bg-slate-900/45 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
            <h3 className="font-outfit font-extrabold text-[15px] sm:text-[17px] text-slate-100 border-b border-slate-800/60 pb-3 mb-4 flex items-center gap-2">
              <Award size={18} className="text-primary" /> Developer Matchmaking Info
            </h3>

            <form onSubmit={handleSaveDeveloperProfile} className="flex flex-col gap-4 text-xs sm:text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-bold text-slate-450 uppercase tracking-wider">City / Location</label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco"
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-bold text-slate-455 uppercase tracking-wider">Technical Skills / Domains (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. AI, React, Cyber"
                  value={userSkills}
                  onChange={(e) => setUserSkills(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-605 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-bold text-slate-455 uppercase tracking-wider">Coding Interests / Hackathon Tracks</label>
                <input
                  type="text"
                  placeholder="e.g. Web3, GenAI, Edge Computing"
                  value={userInterests}
                  onChange={(e) => setUserInterests(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-605 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-bold text-slate-455 uppercase tracking-wider">GitHub Username</label>
                  <input
                    type="text"
                    placeholder="e.g. githubdev"
                    value={userGithub}
                    onChange={(e) => setUserGithub(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-605 focus:outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-bold text-slate-455 uppercase tracking-wider">LinkedIn Handle</label>
                  <input
                    type="text"
                    placeholder="e.g. in/linkedindev"
                    value={userLinkedin}
                    onChange={(e) => setUserLinkedin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-605 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-primary hover:bg-primary/95 text-white font-bold font-outfit px-4 py-2.5 rounded-xl text-xs self-end active:scale-95 transition-all"
              >
                Save Matching Details
              </button>
            </form>
          </div>

          {/* Platform Activity Stats */}
          <div className="bg-slate-900/45 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
            <h3 className="font-outfit font-extrabold text-[15px] sm:text-[17px] text-slate-100 border-b border-slate-800/60 pb-3 mb-4 flex items-center gap-2">
              <Award size={18} className="text-amber-500" /> Platform Activity
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="spinner border-3 border-slate-800 border-t-primary w-6 h-6 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-black text-slate-100 leading-tight font-mono">{profileStats.eventsJoined}</div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">Events</div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-black text-slate-100 leading-tight font-mono">{profileStats.teamsCount}</div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">Squads</div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-black text-slate-100 leading-tight font-mono">{profileStats.postsCreated}</div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">Stories</div>
                </div>
              </div>
            )}
          </div>

          {/* Achievement Badges Vault */}
          <div className="bg-slate-900/45 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
            <h3 className="font-outfit font-extrabold text-[15px] sm:text-[17px] text-slate-100 border-b border-slate-800/60 pb-3 mb-4 flex items-center gap-2">
              <Award size={18} className="text-amber-500" /> Unlockable Achievements
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {badges.map(badge => (
                <div
                  key={badge.id}
                  className={`border rounded-xl p-4 flex gap-3 transition-all ${badge.unlocked
                      ? 'bg-slate-900/45 border-slate-800/85 shadow-sm'
                      : 'bg-slate-950/20 border-slate-900/80 opacity-45'
                    }`}
                >
                  <div className="text-2xl shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-800/50">
                    {badge.unlocked ? badge.icon : '🔒'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                      {badge.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
