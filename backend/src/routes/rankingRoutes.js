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
      .select('id, username, leetcode_id, avatar_url, total_easy, total_medium, total_hard, total_score')
      .order('total_score', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Fetch rankings error:', error);
      return res.status(500).json({ error: 'Failed to fetch rankings: ' + error.message });
    }

    const formatted = (users || []).map((u) => {
      const t = getTierInfo(u.total_score || 0);
      return {
        ...u,
        tier: t.tier,
        tier_badge: t.badge,
        tier_color: t.color,
      };
    });

    return res.json({ rankings: formatted });
  } catch (e) {
    console.error('Rankings Error:', e);
    return res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

module.exports = router;
