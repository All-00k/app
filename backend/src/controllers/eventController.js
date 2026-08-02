const crypto = require('crypto');
const { prepareGet, prepareAll, prepareRun } = require('../database');
const { getTierInfo } = require('../utils/tier');

exports.createEvent = (req, res) => {
  try {
    const { name, description, duration_days, start_date, mode, topic } = req.body;
    if (!name || !duration_days) {
      return res.status(400).json({ error: 'Event name and duration are required' });
    }

    const eventMode = mode || 'standard';
    const eventTopic = topic || '';
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const start = start_date || new Date().toISOString();
    const end = new Date(new Date(start).getTime() + duration_days * 86400000).toISOString();
    const status = new Date(start) <= new Date() ? 'active' : 'upcoming';

    const r = prepareRun(
      'INSERT INTO events (name,description,creator_id,start_date,end_date,duration_days,invite_code,mode,topic,status) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [name, description || '', req.userId, start, end, duration_days, code, eventMode, eventTopic, status]
    );

    const eventId = Number(r.lastInsertRowid);
    const u = prepareGet('SELECT total_easy,total_medium,total_hard FROM users WHERE id=?', [req.userId]) || { total_easy: 0, total_medium: 0, total_hard: 0 };
    prepareRun(
      'INSERT OR IGNORE INTO event_participants (event_id,user_id,easy_at_join,medium_at_join,hard_at_join,current_easy,current_medium,current_hard,score) VALUES (?,?,?,?,?,?,?,?,0)',
      [eventId, Number(req.userId), u.total_easy || 0, u.total_medium || 0, u.total_hard || 0, u.total_easy || 0, u.total_medium || 0, u.total_hard || 0]
    );

    res.status(201).json({
      event: {
        id: r.lastInsertRowid,
        name,
        description: description || '',
        creator_id: req.userId,
        start_date: start,
        end_date: end,
        duration_days,
        invite_code: code,
        mode: eventMode,
        topic: eventTopic,
        status,
      },
    });
  } catch (e) {
    console.error('Create Event Error:', e);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

exports.getEvents = (req, res) => {
  const events = prepareAll(
    `SELECT e.*, u.username as creator_name,
      (SELECT COUNT(*) FROM event_participants WHERE event_id=e.id) as participant_count
     FROM events e JOIN users u ON e.creator_id=u.id
     WHERE e.id IN (SELECT event_id FROM event_participants WHERE user_id=?)
     ORDER BY e.created_at DESC`,
    [req.userId]
  );
  res.json({ events });
};

exports.getEventById = (req, res) => {
  const ev = prepareGet(
    `SELECT e.*, u.username as creator_name,
      (SELECT COUNT(*) FROM event_participants WHERE event_id=e.id) as participant_count
     FROM events e JOIN users u ON e.creator_id=u.id WHERE e.id=?`,
    [Number(req.params.id)]
  );
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  res.json({ event: ev });
};

exports.joinEvent = (req, res) => {
  try {
    const { invite_code } = req.body;
    if (!invite_code) return res.status(400).json({ error: 'Invite code is required' });

    const ev = prepareGet('SELECT * FROM events WHERE invite_code=?', [invite_code.toUpperCase()]);
    if (!ev) return res.status(404).json({ error: 'Invalid invite code' });
    if (ev.status === 'completed') return res.status(400).json({ error: 'This challenge has already ended' });

    if (ev.mode === 'duel') {
      const pList = prepareAll('SELECT id FROM event_participants WHERE event_id=?', [Number(ev.id)]);
      if (pList.length >= 2) return res.status(400).json({ error: 'This duel is full (maximum 2 participants allowed)' });
    }

    const existing = prepareGet('SELECT id FROM event_participants WHERE event_id=? AND user_id=?', [ev.id, req.userId]);
    if (existing) return res.status(409).json({ error: 'You are already in this event' });

    const u = prepareGet('SELECT total_easy,total_medium,total_hard FROM users WHERE id=?', [req.userId]) || { total_easy: 0, total_medium: 0, total_hard: 0 };
    prepareRun(
      'INSERT INTO event_participants (event_id,user_id,easy_at_join,medium_at_join,hard_at_join,current_easy,current_medium,current_hard,score) VALUES (?,?,?,?,?,?,?,?,0)',
      [ev.id, req.userId, u.total_easy || 0, u.total_medium || 0, u.total_hard || 0, u.total_easy || 0, u.total_medium || 0, u.total_hard || 0]
    );

    res.status(201).json({ message: 'Successfully joined event!', event: ev });
  } catch (e) {
    console.error('Join Event Error:', e);
    res.status(500).json({ error: 'Failed to join event' });
  }
};

exports.getLeaderboard = (req, res) => {
  const lb = prepareAll(
    `SELECT ep.*, u.username, u.leetcode_id, u.avatar_url, u.total_score as global_score,
      (ep.current_easy-ep.easy_at_join) as easy_delta,
      (ep.current_medium-ep.medium_at_join) as medium_delta,
      (ep.current_hard-ep.hard_at_join) as hard_delta
     FROM event_participants ep JOIN users u ON ep.user_id=u.id
     WHERE ep.event_id=? ORDER BY ep.score DESC`,
    [Number(req.params.id)]
  );

  const formatted = lb.map((entry) => {
    const t = getTierInfo(entry.global_score || 0);
    return { ...entry, tier: t.tier, tier_badge: t.badge, tier_color: t.color };
  });

  res.json({ leaderboard: formatted });
};

exports.getDailyProgress = (req, res) => {
  const p = prepareGet(
    'SELECT id FROM event_participants WHERE event_id=? AND user_id=?',
    [Number(req.params.eventId), Number(req.params.userId)]
  );
  if (!p) return res.status(404).json({ error: 'Participant not found' });
  const progress = prepareAll('SELECT * FROM daily_progress WHERE participant_id=? ORDER BY date ASC', [p.id]);
  res.json({ progress });
};
