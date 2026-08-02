const express = require('express');
const router = express.Router();
const { prepareAll } = require('../database');
const { getTierInfo } = require('../utils/tier');
const auth = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const r = prepareAll('SELECT id,username,leetcode_id,avatar_url,total_easy,total_medium,total_hard,total_score FROM users ORDER BY total_score DESC LIMIT 100');
  const formatted = r.map((u) => {
    const t = getTierInfo(u.total_score || 0);
    return { ...u, tier: t.tier, tier_badge: t.badge, tier_color: t.color };
  });
  res.json({ rankings: formatted });
});

module.exports = router;
