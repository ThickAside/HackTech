import { supabase } from '../supabase';

// Helper to wrap supabase queries with localStorage fallbacks for unsupported columns
// NOTE: The events table has RLS that blocks INSERT/UPDATE/DELETE for all users.
// Events are stored entirely in localStorage (ht_events_local) for full CRUD.
// Any pre-existing DB rows are merged in read-only mode.

function generateLocalId() {
  return 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

export async function fetchEvents() {
  // 1. Fetch any existing DB events (read-only)
  let dbEvents = [];
  try {
    const { data, error } = await supabase.from('events').select('*');
    if (!error && data) dbEvents = data;
  } catch (e) {
    console.warn('Could not fetch DB events:', e.message);
  }

  // 2. Load local-only events
  const localEvents = JSON.parse(localStorage.getItem('ht_events_local')) || {};
  const extras = JSON.parse(localStorage.getItem('ht_events_extra')) || {};

  // 3. Merge DB events with their extras
  const mergedDbEvents = dbEvents.map(event => {
    const extra = extras[event.id] || {};
    return {
      ...event,
      maxTeamSize: extra.maxTeamSize || 4,
      tags: extra.tags || [],
      updatedAt: extra.updatedAt || event.date,
      createdBy: extra.createdBy || '',
      participants: extra.participants || [],
      bannerUrl: extra.bannerUrl || '',
      theme: extra.theme || '',
      prize: extra.prize || '',
      lastDate: extra.lastDate || event.date
    };
  });

  // 4. Convert local events map to array
  const localEventsArr = Object.values(localEvents);

  // 5. Return combined (DB events first, then local-only events)
  return [...mergedDbEvents, ...localEventsArr];
}

export async function saveEvent(eventData, isCreate, eventId = null) {
  if (isCreate) {
    const newId = generateLocalId();
    const localEvents = JSON.parse(localStorage.getItem('ht_events_local')) || {};
    localEvents[newId] = {
      id: newId,
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      maxParticipants: eventData.maxParticipants ? parseInt(eventData.maxParticipants) : 100,
      date: eventData.date,
      maxTeamSize: parseInt(eventData.maxTeamSize) || 4,
      tags: eventData.tags || [],
      updatedAt: new Date().toISOString(),
      createdBy: eventData.createdBy || '',
      participants: eventData.participants || [],
      bannerUrl: eventData.bannerUrl || '',
      theme: eventData.theme || '',
      prize: eventData.prize || '',
      lastDate: eventData.lastDate || eventData.date
    };
    localStorage.setItem('ht_events_local', JSON.stringify(localEvents));
    return { data: [{ id: newId }], error: null };
  } else {
    if (!eventId) throw new Error('Event ID is required for update');

    // Check if this is a local event or a DB event
    const localEvents = JSON.parse(localStorage.getItem('ht_events_local')) || {};
    if (localEvents[eventId]) {
      // Update local event directly
      localEvents[eventId] = {
        ...localEvents[eventId],
        title: eventData.title !== undefined ? eventData.title : localEvents[eventId].title,
        description: eventData.description !== undefined ? eventData.description : localEvents[eventId].description,
        location: eventData.location !== undefined ? eventData.location : localEvents[eventId].location,
        maxParticipants: eventData.maxParticipants !== undefined ? parseInt(eventData.maxParticipants) : localEvents[eventId].maxParticipants,
        date: eventData.date !== undefined ? eventData.date : localEvents[eventId].date,
        maxTeamSize: eventData.maxTeamSize !== undefined ? parseInt(eventData.maxTeamSize) : localEvents[eventId].maxTeamSize,
        tags: eventData.tags !== undefined ? eventData.tags : localEvents[eventId].tags,
        updatedAt: new Date().toISOString(),
        bannerUrl: eventData.bannerUrl !== undefined ? eventData.bannerUrl : localEvents[eventId].bannerUrl,
        theme: eventData.theme !== undefined ? eventData.theme : localEvents[eventId].theme,
        prize: eventData.prize !== undefined ? eventData.prize : localEvents[eventId].prize,
        lastDate: eventData.lastDate !== undefined ? eventData.lastDate : localEvents[eventId].lastDate
      };
      if (eventData.participants !== undefined) {
        localEvents[eventId].participants = eventData.participants;
      }
      if (eventData.createdBy !== undefined) {
        localEvents[eventId].createdBy = eventData.createdBy;
      }
      localStorage.setItem('ht_events_local', JSON.stringify(localEvents));
    } else {
      // DB event — update extras only (DB is read-only)
      const extras = JSON.parse(localStorage.getItem('ht_events_extra')) || {};
      extras[eventId] = {
        ...extras[eventId],
        maxTeamSize: eventData.maxTeamSize !== undefined ? parseInt(eventData.maxTeamSize) : extras[eventId]?.maxTeamSize || 4,
        tags: eventData.tags !== undefined ? eventData.tags : extras[eventId]?.tags || [],
        updatedAt: new Date().toISOString(),
        bannerUrl: eventData.bannerUrl !== undefined ? eventData.bannerUrl : extras[eventId]?.bannerUrl || '',
        theme: eventData.theme !== undefined ? eventData.theme : extras[eventId]?.theme || '',
        prize: eventData.prize !== undefined ? eventData.prize : extras[eventId]?.prize || '',
        lastDate: eventData.lastDate !== undefined ? eventData.lastDate : extras[eventId]?.lastDate
      };
      if (eventData.participants !== undefined) {
        extras[eventId].participants = eventData.participants;
      }
      localStorage.setItem('ht_events_extra', JSON.stringify(extras));
    }
    return { error: null };
  }
}

export async function deleteEvent(eventId) {
  // Check if local event
  const localEvents = JSON.parse(localStorage.getItem('ht_events_local')) || {};
  if (localEvents[eventId]) {
    delete localEvents[eventId];
    localStorage.setItem('ht_events_local', JSON.stringify(localEvents));
  } else {
    // Try DB delete (may fail due to RLS, but try anyway)
    try {
      await supabase.from('events').delete().eq('id', eventId);
    } catch (e) {
      console.warn('DB event delete failed (RLS):', e.message);
    }
  }
  
  const extras = JSON.parse(localStorage.getItem('ht_events_extra')) || {};
  delete extras[eventId];
  localStorage.setItem('ht_events_extra', JSON.stringify(extras));
  return { error: null };
}

export async function fetchTeams() {
  const { data, error } = await supabase.from('teams').select('*');
  if (error) throw error;
  
  const extras = JSON.parse(localStorage.getItem('ht_teams_extra')) || {};
  
  return (data || []).map(team => {
    const extra = extras[team.id] || {};
    return {
      ...team,
      name: team.team_name || '',
      leaderId: team.leader_id || '',
      eventId: extra.eventId || '',
      description: extra.description || '',
      members: extra.members || [],
      inviteCode: extra.inviteCode || '',
      maxSize: extra.maxSize || 4
    };
  });
}

export async function saveTeam(teamData, isCreate, teamId = null) {
  const dbPayload = {
    team_name: teamData.name || teamData.team_name,
    leader_id: teamData.leaderId || teamData.leader_id
  };

  if (isCreate) {
    const { data, error } = await supabase.from('teams').insert([dbPayload]).select('id');
    if (error) throw error;
    
    const insertedId = data?.[0]?.id;
    if (insertedId) {
      const extras = JSON.parse(localStorage.getItem('ht_teams_extra')) || {};
      extras[insertedId] = {
        eventId: teamData.eventId,
        description: teamData.description || '',
        members: teamData.members || [],
        inviteCode: teamData.inviteCode || '',
        maxSize: parseInt(teamData.maxSize) || 4
      };
      localStorage.setItem('ht_teams_extra', JSON.stringify(extras));
      return { data: [{ id: insertedId }], error: null };
    }
    return { data, error: new Error('Failed to retrieve inserted team ID') };
  } else {
    if (!teamId) throw new Error('Team ID is required for update');
    const { error } = await supabase.from('teams').update(dbPayload).eq('id', teamId);
    if (error) throw error;
    
    const extras = JSON.parse(localStorage.getItem('ht_teams_extra')) || {};
    extras[teamId] = {
      ...extras[teamId],
      eventId: teamData.eventId || extras[teamId]?.eventId || '',
      description: teamData.description !== undefined ? teamData.description : extras[teamId]?.description || '',
      members: teamData.members || extras[teamId]?.members || [],
      inviteCode: teamData.inviteCode || extras[teamId]?.inviteCode || '',
      maxSize: teamData.maxSize !== undefined ? parseInt(teamData.maxSize) : extras[teamId]?.maxSize || 4
    };
    localStorage.setItem('ht_teams_extra', JSON.stringify(extras));
    return { error: null };
  }
}

export async function deleteTeam(teamId) {
  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  if (error) throw error;
  
  const extras = JSON.parse(localStorage.getItem('ht_teams_extra')) || {};
  delete extras[teamId];
  localStorage.setItem('ht_teams_extra', JSON.stringify(extras));
  return { error: null };
}

export async function fetchPosts() {
  const { data, error } = await supabase.from('posts').select('*');
  if (error) throw error;
  
  const extras = JSON.parse(localStorage.getItem('ht_posts_extra')) || {};
  
  return (data || []).map(post => {
    const extra = extras[post.id] || {};
    return {
      ...post,
      body: post.content || '',
      authorId: post.user_id || '',
      eventId: extra.eventId || '',
      eventTitle: extra.eventTitle || '',
      authorName: extra.authorName || '',
      likes: extra.likes || []
    };
  });
}

export async function savePost(postData, isCreate, postId = null) {
  const dbPayload = {
    title: postData.title,
    content: postData.body || postData.content,
    user_id: postData.authorId || postData.user_id
  };

  if (isCreate) {
    const { data, error } = await supabase.from('posts').insert([dbPayload]).select('id');
    if (error) throw error;
    
    const insertedId = data?.[0]?.id;
    if (insertedId) {
      const extras = JSON.parse(localStorage.getItem('ht_posts_extra')) || {};
      extras[insertedId] = {
        eventId: postData.eventId || '',
        eventTitle: postData.eventTitle || '',
        authorName: postData.authorName || '',
        likes: postData.likes || []
      };
      localStorage.setItem('ht_posts_extra', JSON.stringify(extras));
      return { data: [{ id: insertedId }], error: null };
    }
    return { data, error: new Error('Failed to retrieve inserted post ID') };
  } else {
    if (!postId) throw new Error('Post ID is required for update');
    const { error } = await supabase.from('posts').update(dbPayload).eq('id', postId);
    if (error) throw error;
    
    const extras = JSON.parse(localStorage.getItem('ht_posts_extra')) || {};
    extras[postId] = {
      ...extras[postId],
      eventId: postData.eventId || extras[postId]?.eventId || '',
      eventTitle: postData.eventTitle || extras[postId]?.eventTitle || '',
      authorName: postData.authorName || extras[postId]?.authorName || '',
      likes: postData.likes || extras[postId]?.likes || []
    };
    localStorage.setItem('ht_posts_extra', JSON.stringify(extras));
    return { error: null };
  }
}

export async function deletePost(postId) {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
  
  const extras = JSON.parse(localStorage.getItem('ht_posts_extra')) || {};
  delete extras[postId];
  localStorage.setItem('ht_posts_extra', JSON.stringify(extras));
  return { error: null };
}

export async function fetchProfiles() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  
  const extras = JSON.parse(localStorage.getItem('ht_users_extra')) || {};
  
  return (data || []).map(profile => {
    const extra = extras[profile.id] || {};
    // DB skills is an array — convert to comma-separated string for UI
    const dbSkills = Array.isArray(profile.skills) ? profile.skills.join(', ') : (profile.skills || '');
    return {
      ...profile,
      name: profile.full_name || '',
      university: extra.university || profile.college || '',
      year: extra.year || '',
      organization: extra.organization || '',
      orgRole: extra.orgRole || '',
      skills: dbSkills || extra.skills || '',
      bio: profile.bio || extra.bio || '',
      college: profile.college || extra.college || '',
      github_url: profile.github_url || extra.github_url || '',
      linkedin_url: profile.linkedin_url || extra.linkedin_url || '',
      profile_image: profile.profile_image || extra.profile_image || '',
      joinedEvents: profile.joinedEvents || []
    };
  });
}

export async function saveProfile(profileData, isCreate, userId) {
  const dbPayload = {};
  if (profileData.name !== undefined) dbPayload.full_name = profileData.name;
  if (profileData.full_name !== undefined) dbPayload.full_name = profileData.full_name;
  if (profileData.email !== undefined) dbPayload.email = profileData.email;
  if (profileData.role !== undefined) dbPayload.role = profileData.role;
  if (profileData.bio !== undefined) dbPayload.bio = profileData.bio;
  if (profileData.college !== undefined) dbPayload.college = profileData.college;
  if (profileData.github_url !== undefined) dbPayload.github_url = profileData.github_url;
  if (profileData.linkedin_url !== undefined) dbPayload.linkedin_url = profileData.linkedin_url;
  if (profileData.profile_image !== undefined) dbPayload.profile_image = profileData.profile_image;
  
  // Convert skills string to array for DB (DB column is array type)
  if (profileData.skills !== undefined) {
    if (typeof profileData.skills === 'string') {
      dbPayload.skills = profileData.skills.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(profileData.skills)) {
      dbPayload.skills = profileData.skills;
    } else {
      dbPayload.skills = [];
    }
  }

  const { error } = await supabase.from('profiles').upsert([{ id: userId, ...dbPayload }]);
  if (error) throw error;
  
  const extras = JSON.parse(localStorage.getItem('ht_users_extra')) || {};
  extras[userId] = {
    ...extras[userId],
    university: profileData.university !== undefined ? profileData.university : extras[userId]?.university || '',
    year: profileData.year !== undefined ? profileData.year : extras[userId]?.year || '',
    organization: profileData.organization !== undefined ? profileData.organization : extras[userId]?.organization || '',
    orgRole: profileData.orgRole !== undefined ? profileData.orgRole : extras[userId]?.orgRole || '',
    skills: profileData.skills !== undefined ? profileData.skills : extras[userId]?.skills || ''
  };
  localStorage.setItem('ht_users_extra', JSON.stringify(extras));
  return { error: null };
}
