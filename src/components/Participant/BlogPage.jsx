import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Heart, Search, Plus, Trash2, Calendar, User, Sparkles, X, MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchPosts as fetchPostsFallback, savePost as savePostFallback, deletePost, fetchEvents as fetchEventsFallback, fetchProfiles as fetchProfilesFallback } from '../../utils/supabaseFallback';

export default function BlogPage() {
  const { userData, showToast } = useApp();
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [profileRoles, setProfileRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Post modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [publishing, setPublishing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Posts
      const postsData = await fetchPostsFallback();
      const sortedPosts = (postsData || []).sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
      setPosts(sortedPosts);

      // 2. Fetch Events for dropdown
      const eventsData = await fetchEventsFallback();
      setEvents(eventsData || []);

      // 3. Fetch Profile Roles
      const profilesData = await fetchProfilesFallback();
      const rolesMap = {};
      (profilesData || []).forEach(p => {
        rolesMap[p.id] = p.role;
      });
      setProfileRoles(rolesMap);
    } catch (err) {
      showToast(err.message || 'Failed to sync blog feed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setTitle('');
    setBody('');
    setSelectedEventId('');
    setShowCreateModal(true);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!title || !body) {
      showToast('Title and Body are required to post.', 'warning');
      return;
    }

    setPublishing(true);

    const eventObj = events.find(e => e.id === selectedEventId);

    const newPost = {
      title,
      body,
      eventId: selectedEventId || null,
      eventTitle: eventObj ? eventObj.title : 'General Tech Story',
      authorId: userData.uid,
      authorName: userData.name || userData.email.split('@')[0],
      likes: []
    };

    try {
      await savePostFallback(newPost, true);

      showToast('Story published to HackTech stream!', 'success');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to publish post.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleLikePost = async (post) => {
    const isLiked = post.likes?.includes(userData.uid);
    let nextLikes = [...(post.likes || [])];

    if (isLiked) {
      nextLikes = nextLikes.filter(uid => uid !== userData.uid);
    } else {
      nextLikes.push(userData.uid);
    }

    try {
      await savePostFallback({ ...post, likes: nextLikes }, false, post.id);

      // Update locally immediately
      setPosts(posts.map(p => p.id === post.id ? { ...p, likes: nextLikes } : p));
    } catch (err) {
      showToast(err.message || 'Liking failed.', 'error');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this story? This action cannot be undone.')) return;

    try {
      await deletePost(postId);
      showToast('Story removed successfully.', 'info');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete story.', 'error');
    }
  };

  // Filter posts based on search query (search title, content body, or author name)
  const filteredPosts = posts.filter(post => {
    const query = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(query) ||
      post.body.toLowerCase().includes(query) ||
      post.authorName.toLowerCase().includes(query) ||
      (post.eventTitle && post.eventTitle.toLowerCase().includes(query))
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

  return (
    <div id="page-blog" className="page-enter">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-8 sm:mb-10">
        <div>
          <h1 className="font-outfit font-black text-3xl sm:text-4xl text-slate-100 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block">
            HackTech Stream
          </h1>
          <p className="text-sm sm:text-base text-slate-350 mt-1.5 sm:mt-2">
            Read experience reports, coding discoveries, and ideas from fellow participants.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-bold font-outfit px-4.5 py-2.5 sm:px-6 sm:py-3 rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-95 text-sm sm:text-base shrink-0 self-start sm:self-auto"
        >
          <Plus size={18} /> Share Your Story
        </button>
      </div>

      {/* Search Filter Panel */}
      <div className="relative w-full mb-8 sm:mb-10">
        <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          placeholder="Search tech stories by keyword, event topic, or author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl py-3 sm:py-4 pl-11 pr-4 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/45 transition-colors shadow-sm"
        />
      </div>

      {/* Blog stream feed */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="spinner border-4 border-slate-800 border-t-primary w-12 h-12 rounded-full animate-spin"></div>
          <span className="text-base font-medium text-slate-500">Loading stories...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 sm:p-14 lg:p-20 text-center border border-slate-800/60">
          <span className="text-4xl sm:text-5xl font-emoji">📖</span>
          <h3 className="font-outfit font-extrabold text-lg sm:text-xl text-slate-200 mt-4 sm:mt-6">Empty Stream</h3>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-md mx-auto">
            No posts found matching that filter. Be the first to share a coding story!
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 sm:mt-6 text-xs sm:text-sm bg-primary hover:bg-primary/95 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold shadow-md transition-colors"
          >
            Publish a Story
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {filteredPosts.map(post => {
            const isLiked = post.likes?.includes(userData.uid);
            const isAuthor = post.authorId === userData.uid;

            return (
              <div
                key={post.id}
                className="bg-slate-900/45 border border-slate-800/80 rounded-2xl p-5 sm:p-6 md:p-8 xl:p-10 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/35 transition-all flex flex-col md:flex-row gap-5 sm:gap-6 md:gap-8"
              >
                {/* Left Side: Avatar Details */}
                <div className="md:w-44 lg:w-52 xl:w-56 shrink-0 flex flex-row md:flex-col items-center md:items-start gap-3 sm:gap-4 border-b md:border-b-0 md:border-r border-slate-800/60 pb-4 md:pb-0 md:pr-6 lg:pr-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-primary font-bold shadow-sm shadow-primary/5 shrink-0">
                    <User size={18} className="sm:size-[22px]" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-100 text-sm sm:text-[16px] truncate max-w-[160px] flex flex-wrap items-center gap-1.5" title={post.authorName}>
                      <span className="truncate">{post.authorName}</span>
                      {profileRoles[post.authorId] === 'organiser' && (
                        <span className="text-[9px] font-extrabold bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider font-outfit" title="Verified Organiser">
                          Organiser
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] sm:text-[13px] text-slate-500 font-mono mt-0.5 sm:mt-1">
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Right Side: Primary content */}
                <div className="flex-1 flex flex-col justify-between gap-5 sm:gap-6 min-w-0">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5 sm:mb-3">
                      <span className="text-[10px] sm:text-[12px] font-bold text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-[6px] truncate max-w-[280px]">
                        🎯 {post.eventTitle || 'General tech'}
                      </span>
                    </div>

                    <h3 className="font-outfit font-black text-xl sm:text-2xl md:text-3xl text-slate-100 mb-3 sm:mb-4">
                      {post.title}
                    </h3>

                    <p className="text-slate-250 text-sm sm:text-[15px] lg:text-[16.5px] leading-relaxed whitespace-pre-line">
                      {post.body}
                    </p>
                  </div>

                  {/* Actions (Like, Delete) */}
                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-5 mt-3">
                    <button
                      onClick={() => handleLikePost(post)}
                      className={`flex items-center gap-2 text-sm font-semibold px-4.5 py-2.5 rounded-xl transition-all ${isLiked
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
                          : 'bg-slate-950/60 border border-slate-805 hover:bg-slate-900 text-slate-400'
                        }`}
                      title={isLiked ? 'Unlike this' : 'Like this'}
                    >
                      <Heart size={16} className={isLiked ? 'fill-rose-500 text-rose-550' : ''} />
                      <span>{post.likes?.length || 0} Likes</span>
                    </button>

                    {isAuthor && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-slate-500 hover:text-danger hover:bg-slate-900 p-2.5 rounded-xl transition-colors"
                        title="Delete Story"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE POST FORM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden page-enter">
            <div className="p-4 sm:p-6 border-b border-slate-850 flex justify-between items-center">
              <h3 className="font-outfit font-black text-xl sm:text-2xl text-slate-100 flex items-center gap-2.5">
                <Sparkles size={18} className="sm:size-[20px] text-accent" /> Share Your Tech Story
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-450 hover:text-slate-200 hover:bg-slate-850 p-1.5 sm:p-2 rounded-xl transition-colors"
              >
                <X size={18} className="sm:size-[20px]" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[12.5px] font-bold text-slate-400 uppercase tracking-widest">Select Related Event (Optional)</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-4.5 py-3 text-[15px] focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-900 text-slate-250 font-semibold"
                >
                  <option value="" className="bg-slate-950">-- No Related Event (General Tech Talk) --</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id} className="bg-slate-950">
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12.5px] font-bold text-slate-400 uppercase tracking-widest">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How we containerized our Next.js application in 4 hours"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4.5 py-3.5 text-[15px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12.5px] font-bold text-slate-400 uppercase tracking-widest">Story Content *</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Describe your design choices, codebase configurations, stack learnings, or general developer takeaways..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4.5 py-3.5 text-[15px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary/45 transition-colors focus:bg-slate-950 focus:ring-4 focus:ring-primary/10 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-850 pt-5 mt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-slate-400 border border-slate-800 rounded-xl hover:bg-slate-850 text-sm font-semibold font-outfit"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="px-6 py-2.5 text-white bg-primary hover:bg-primary/95 rounded-xl text-sm font-semibold font-outfit shadow-lg shadow-primary/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  {publishing ? 'Publishing...' : 'Stream Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
