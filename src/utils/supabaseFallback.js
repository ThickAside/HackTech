import { supabase } from '../supabase';

// Events are now stored entirely in Supabase.
// The RLS policies on the events table must allow organisers/admins to INSERT/UPDATE/DELETE.
// All authenticated users can SELECT events.

export async function fetchEvents() {
  try {
    const { data, error } = await supabase.from('events').select('*');
    if (error) throw error;

    // Normalise DB column names to the camelCase keys the UI expects
    return (data || []).map(event => ({
      ...event,
      maxParticipants: event.max_participants ?? event.maxParticipants ?? 100,
      maxTeamSize:     event.max_team_size    ?? event.maxTeamSize    ?? 4,
      tags:            event.tags             ?? [],
      participants:    event.participants     ?? [],
      createdBy:       event.created_by       ?? event.createdBy      ?? '',
      bannerUrl:       event.banner_url       ?? event.bannerUrl      ?? '',
      theme:           event.theme            ?? '',
      prize:           event.prize            ?? '',
      lastDate:        event.last_date        ?? event.lastDate       ?? null,
    }));
  } catch (e) {
    console.warn('Could not fetch events from DB:', e.message);
    return [];
  }
}

export async function saveEvent(eventData, isCreate, eventId = null) {
  // Map camelCase UI fields to snake_case DB columns
  const dbPayload = {
    title:            eventData.title,
    description:      eventData.description,
    location:         eventData.location,
    date:             eventData.date,
    max_participants: eventData.maxParticipants != null ? parseInt(eventData.maxParticipants) : 100,
    max_team_size:    eventData.maxTeamSize     != null ? parseInt(eventData.maxTeamSize)     : 4,
    tags:             eventData.tags            ?? [],
    participants:     eventData.participants    ?? [],
    created_by:       eventData.createdBy       ?? null,
    banner_url:       eventData.bannerUrl       ?? '',
    theme:            eventData.theme           ?? '',
    prize:            eventData.prize           ?? '',
    last_date:        eventData.lastDate        ?? null,
  };

  if (isCreate) {
    const { data, error } = await supabase
      .from('events')
      .insert([dbPayload])
      .select('id');
    if (error) throw error;
    return { data, error: null };
  } else {
    if (!eventId) throw new Error('Event ID is required for update');

    // Only include defined fields in the update payload
    const updatePayload = {};
    if (eventData.title            !== undefined) updatePayload.title            = eventData.title;
    if (eventData.description      !== undefined) updatePayload.description      = eventData.description;
    if (eventData.location         !== undefined) updatePayload.location         = eventData.location;
    if (eventData.date             !== undefined) updatePayload.date             = eventData.date;
    if (eventData.maxParticipants  !== undefined) updatePayload.max_participants = parseInt(eventData.maxParticipants);
    if (eventData.maxTeamSize      !== undefined) updatePayload.max_team_size    = parseInt(eventData.maxTeamSize);
    if (eventData.tags             !== undefined) updatePayload.tags             = eventData.tags;
    if (eventData.participants     !== undefined) updatePayload.participants     = eventData.participants;
    if (eventData.createdBy        !== undefined) updatePayload.created_by       = eventData.createdBy;
    if (eventData.bannerUrl        !== undefined) updatePayload.banner_url       = eventData.bannerUrl;
    if (eventData.theme            !== undefined) updatePayload.theme            = eventData.theme;
    if (eventData.prize            !== undefined) updatePayload.prize            = eventData.prize;
    if (eventData.lastDate         !== undefined) updatePayload.last_date        = eventData.lastDate;

    const { error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', eventId);
    if (error) throw error;
    return { error: null };
  }
}

export async function deleteEvent(eventId) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);
  if (error) throw error;
  return { error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// joinEvent / leaveEvent
// Participants cannot directly UPDATE the events table (RLS only allows admins
// and organisers to do full updates). These functions call SECURITY DEFINER
// Postgres RPC functions that safely append / remove only the calling user's
// own ID from the participants array, bypassing the organiser-only policy.
//
// Requires the Supabase RPC functions to be created first:
//   → run supabase_join_leave_rpc.sql in the Supabase SQL Editor
// ─────────────────────────────────────────────────────────────────────────────
export async function joinEvent(eventId) {
  const { error } = await supabase.rpc('join_event', { p_event_id: eventId });
  if (error) throw error;
  return { error: null };
}

export async function leaveEvent(eventId) {
  const { error } = await supabase.rpc('leave_event', { p_event_id: eventId });
  if (error) throw error;
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
