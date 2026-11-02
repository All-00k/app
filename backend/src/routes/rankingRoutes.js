const express = require('express');
const router = express.Router();
const { supabase } = require('../database');
const { getTierInfo } = require('../utils/tier');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, leetcode_id, avatar_url, total_easy, total_medium, total_hard, total_score, xp, last_synced_at, created_at')
      .order('total_score', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Fetch rankings error:', error);
      return res.status(500).json({ error: 'Failed to fetch rankings: ' + error.message });
    }

    const formatted = (users || []).map((u) => {
      const t = getTierInfo(u.total_score || 0);
      return {
        id: u.id,
        username: u.username,
        email: u.email || '',
        leetcode_id: u.leetcode_id,
        avatar_url: u.avatar_url || '',
        total_easy: u.total_easy || 0,
        total_medium: u.total_medium || 0,
        total_hard: u.total_hard || 0,
        total_score: u.total_score || 0,
        xp: u.xp || ((u.total_score || 0) * 10),
        tier: t.tier,
        tier_badge: t.badge,
        tier_color: t.color,
        color: t.color,
        next_score: t.nextScore,
        min_score: t.minScore,
        last_synced_at: u.last_synced_at,
        created_at: u.created_at,
      };
    });

    return res.json({ rankings: formatted });
  } catch (e) {
    console.error('Rankings Error:', e);
    return res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

module.exports = router;
