const crypto = require('crypto');
const { supabase } = require('../database');
const { getTierInfo } = require('../utils/tier');

exports.createEvent = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { name, description, duration_days, start_date, mode, topic } = req.body;
    if (!name || !duration_days) {
      return res.status(400).json({ error: 'Event name and duration are required' });
    }

    const eventMode = mode || 'standard';
    const eventTopic = topic || '';
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const start = start_date || new Date().toISOString();
    const end = new Date(new Date(start).getTime() + Number(duration_days) * 86400000).toISOString();
    const status = new Date(start) <= new Date() ? 'active' : 'upcoming';

    // 1. Create event
    const { data: event, error: evErr } = await supabase
      .from('events')
      .insert({
        name,
        description: description || '',
        creator_id: req.userId,
        start_date: start,
        end_date: end,
        duration_days: Number(duration_days),
        invite_code: code,
        mode: eventMode,
        topic: eventTopic,
        status,
      })
      .select()
      .single();

    if (evErr) {
      console.error('Supabase Create Event Error:', evErr);
      return res.status(500).json({ error: 'Failed to create tournament: ' + evErr.message });
    }

    // 2. Fetch creator's baseline stats
    const { data: u } = await supabase
      .from('users')
      .select('username, total_easy, total_medium, total_hard')
      .eq('id', req.userId)
      .maybeSingle();

    const totalEasy = u?.total_easy || 0;
    const totalMedium = u?.total_medium || 0;
    const totalHard = u?.total_hard || 0;

    // 3. Auto-join creator as participant
    const { error: partErr } = await supabase
      .from('event_participants')
      .insert({
        event_id: event.id,
        user_id: req.userId,
        easy_at_join: totalEasy,
        medium_at_join: totalMedium,
        hard_at_join: totalHard,
        current_easy: totalEasy,
        current_medium: totalMedium,
        current_hard: totalHard,
        score: 0,
      });

    if (partErr) {
      console.error('Auto-join creator error:', partErr);
    }

    const formattedEvent = {
      ...event,
      creator_name: u?.username || 'You',
      participant_count: 1,
    };

    return res.status(201).json({ event: formattedEvent });
  } catch (e) {
    console.error('Create Event Error:', e);
    return res.status(500).json({ error: 'Failed to create event: ' + e.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Find all event_ids that req.userId has joined
    const { data: participations, error: pErr } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('user_id', req.userId);

    if (pErr) {
      console.error('Fetch participations error:', pErr);
      return res.status(500).json({ error: 'Failed to fetch user events' });
    }

    const joinedEventIds = (participations || []).map((p) => p.event_id);

    // Fetch events where user is participant OR creator
    let query = supabase
      .from('events')
      .select(`
        *,
        creator:users!creator_id(username),
        participants:event_participants(count)
      `)
      .order('created_at', { ascending: false });

    if (joinedEventIds.length > 0) {
      query = query.or(`id.in.(${joinedEventIds.join(',')}),creator_id.eq.${req.userId}`);
    } else {
      query = query.eq('creator_id', req.userId);
    }

    const { data: events, error: evErr } = await query;

    if (evErr) {
      console.error('Fetch events error:', evErr);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }

    const formatted = (events || []).map((ev) => ({
      ...ev,
      creator_name: ev.creator?.username || 'Unknown',
      participant_count: ev.participants?.[0]?.count || 0,
    }));

    return res.json({ events: formatted });
  } catch (e) {
    console.error('Get Events Error:', e);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { data: ev, error } = await supabase
      .from('events')
      .select(`
        *,
        creator:users!creator_id(username),
        participants:event_participants(count)
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !ev) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json({
      event: {
        ...ev,
        creator_name: ev.creator?.username || 'Unknown',
        participant_count: ev.participants?.[0]?.count || 0,
      },
    });
  } catch (e) {
    console.error('Get Event By ID Error:', e);
    return res.status(500).json({ error: 'Failed to fetch event details' });
  }
};

exports.joinEvent = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { invite_code } = req.body;
    if (!invite_code) return res.status(400).json({ error: 'Invite code is required' });

    const normalizedCode = invite_code.trim().toUpperCase();

    // 1. Fetch event
    const { data: ev, error: evErr } = await supabase
      .from('events')
      .select('*')
      .ilike('invite_code', normalizedCode)
      .maybeSingle();

    if (evErr || !ev) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    if (ev.status === 'completed') {
      return res.status(400).json({ error: 'This challenge has already ended' });
    }

    // 2. Check 1v1 Duel limit
    if (ev.mode === 'duel') {
      const { count, error: countErr } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', ev.id);

      if (!countErr && (count || 0) >= 2) {
        return res.status(400).json({ error: 'This duel is full (maximum 2 participants allowed)' });
      }
    }

    // 3. Check if already joined
    const { data: existing, error: existErr } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', ev.id)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'You are already in this event' });
    }

    // 4. Fetch joining user's current baseline stats
    const { data: u } = await supabase
      .from('users')
      .select('total_easy, total_medium, total_hard')
      .eq('id', req.userId)
      .maybeSingle();

    const totalEasy = u?.total_easy || 0;
    const totalMedium = u?.total_medium || 0;
    const totalHard = u?.total_hard || 0;

    // 5. Insert participant
    const { error: joinErr } = await supabase
      .from('event_participants')
      .insert({
        event_id: ev.id,
        user_id: req.userId,
        easy_at_join: totalEasy,
        medium_at_join: totalMedium,
        hard_at_join: totalHard,
        current_easy: totalEasy,
        current_medium: totalMedium,
        current_hard: totalHard,
        score: 0,
      });

    if (joinErr) {
      if (joinErr.code === '23505') {
        return res.status(409).json({ error: 'You are already in this event' });
      }
      return res.status(500).json({ error: 'Failed to join event: ' + joinErr.message });
    }

    const { count } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', ev.id);

    const { data: creator } = await supabase
      .from('users')
      .select('username')
      .eq('id', ev.creator_id)
      .maybeSingle();

    const formattedEvent = {
      ...ev,
      creator_name: creator?.username || 'Unknown',
      participant_count: count || 1,
    };

    return res.status(201).json({ message: 'Successfully joined event!', event: formattedEvent });
  } catch (e) {
    console.error('Join Event Error:', e);
    return res.status(500).json({ error: 'Failed to join event' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { data: lb, error } = await supabase
      .from('event_participants')
      .select(`
        *,
        user:users!user_id(username, leetcode_id, avatar_url, total_score)
      `)
      .eq('event_id', req.params.id)
      .order('score', { ascending: false });

    if (error) {
      console.error('Supabase Leaderboard Error:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard: ' + error.message });
    }

    const formatted = (lb || []).map((entry) => {
      const globalScore = entry.user?.total_score || 0;
      const t = getTierInfo(globalScore);
      return {
        id: entry.id,
        event_id: entry.event_id,
        user_id: entry.user_id,
        username: entry.user?.username || 'Unknown',
        leetcode_id: entry.user?.leetcode_id || '',
        avatar_url: entry.user?.avatar_url || '',
        global_score: globalScore,
        score: entry.score,
        easy_at_join: entry.easy_at_join,
        medium_at_join: entry.medium_at_join,
        hard_at_join: entry.hard_at_join,
        current_easy: entry.current_easy,
        current_medium: entry.current_medium,
        current_hard: entry.current_hard,
        easy_delta: (entry.current_easy || 0) - (entry.easy_at_join || 0),
        medium_delta: (entry.current_medium || 0) - (entry.medium_at_join || 0),
        hard_delta: (entry.current_hard || 0) - (entry.hard_at_join || 0),
        tier: t.tier,
        tier_badge: t.badge,
        tier_color: t.color,
        joined_at: entry.joined_at,
      };
    });

    return res.json({ leaderboard: formatted });
  } catch (e) {
    console.error('Get Leaderboard Error:', e);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

exports.getDailyProgress = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { data: p, error: pErr } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', req.params.eventId)
      .eq('user_id', req.params.userId)
      .maybeSingle();

    if (pErr || !p) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const { data: progress, error: progErr } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('participant_id', p.id)
      .order('date', { ascending: true });

    if (progErr) {
      return res.status(500).json({ error: 'Failed to fetch daily progress' });
    }

    return res.json({ progress: progress || [] });
  } catch (e) {
    console.error('Get Daily Progress Error:', e);
    return res.status(500).json({ error: 'Failed to fetch daily progress' });
  }
};
