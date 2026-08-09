const { supabase } = require('../database');

exports.getNotifications = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Find all event_ids user is participating in
    const { data: participations, error: pErr } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('user_id', req.userId);

    if (pErr) {
      console.error('Notification participations error:', pErr);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    const eventIds = (participations || []).map((p) => p.event_id);
    if (eventIds.length === 0) {
      return res.json({ notifications: [] });
    }

    const { data: notifications, error: nErr } = await supabase
      .from('notifications')
      .select(`
        *,
        event:events!event_id(name),
        user:users!user_id(username)
      `)
      .in('event_id', eventIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (nErr) {
      console.error('Fetch notifications error:', nErr);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    const formatted = (notifications || []).map((n) => ({
      id: n.id,
      event_id: n.event_id,
      user_id: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      created_at: n.created_at,
      event_name: n.event?.name || 'CodeArena Event',
      solver_name: n.user?.username || 'Coder',
    }));

    return res.json({ notifications: formatted });
  } catch (e) {
    console.error('Get Notifications Error:', e);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.registerPushToken = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { push_token } = req.body;
    if (!push_token) return res.status(400).json({ error: 'Push token required' });

    const { error } = await supabase
      .from('users')
      .update({ push_token })
      .eq('id', req.userId);

    if (error) {
      console.error('Push token update error:', error);
      return res.status(500).json({ error: 'Failed to register push token' });
    }

    return res.json({ message: 'Push token registered successfully' });
  } catch (e) {
    console.error('Push Token Registration Error:', e);
    return res.status(500).json({ error: 'Failed to register push token' });
  }
};
