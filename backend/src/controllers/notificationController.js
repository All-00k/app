const { prepareAll, prepareRun } = require('../database');

exports.getNotifications = (req, res) => {
  try {
    const notifications = prepareAll(
      `SELECT n.*, e.name as event_name, u.username as solver_name
       FROM notifications n
       JOIN events e ON n.event_id = e.id
       JOIN users u ON n.user_id = u.id
       WHERE n.event_id IN (SELECT event_id FROM event_participants WHERE user_id=?)
       ORDER BY n.created_at DESC LIMIT 50`,
      [req.userId]
    );
    res.json({ notifications });
  } catch (e) {
    console.error('Get Notifications Error:', e);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.registerPushToken = (req, res) => {
  try {
    const { push_token } = req.body;
    if (!push_token) return res.status(400).json({ error: 'Push token required' });

    prepareRun('UPDATE users SET push_token=? WHERE id=?', [push_token, req.userId]);
    res.json({ message: 'Push token registered successfully' });
  } catch (e) {
    console.error('Push Token Registration Error:', e);
    res.status(500).json({ error: 'Failed to register push token' });
  }
};
