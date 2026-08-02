const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { prepareGet, prepareRun } = require('../database');
const { fetchLeetCodeStats, calculateScore } = require('../leetcode');
const { getTierInfo } = require('../utils/tier');

exports.register = async (req, res) => {
  try {
    const { username, email, password, leetcode_id } = req.body;
    if (!username || !email || !password || !leetcode_id) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    let lc;
    try {
      lc = await fetchLeetCodeStats(leetcode_id);
    } catch (e) {
      return res.status(400).json({ error: `Invalid LeetCode ID: ${e.message}` });
    }

    const hash = await bcrypt.hash(password, 10);
    const score = calculateScore(lc.stats.easy, lc.stats.medium, lc.stats.hard);
    const tierInfo = getTierInfo(score);

    const r = prepareRun(
      `INSERT INTO users (username,email,password_hash,leetcode_id,avatar_url,total_easy,total_medium,total_hard,total_score,tier,xp,last_synced_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
      [username, email, hash, leetcode_id, lc.avatar || '', lc.stats.easy, lc.stats.medium, lc.stats.hard, score, tierInfo.tier, score * 10]
    );

    const token = jwt.sign({ userId: r.lastInsertRowid }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      token,
      user: {
        id: r.lastInsertRowid,
        username,
        email,
        leetcode_id,
        avatar_url: lc.avatar || '',
        total_easy: lc.stats.easy,
        total_medium: lc.stats.medium,
        total_hard: lc.stats.hard,
        total_score: score,
        tier: tierInfo.tier,
        tier_badge: tierInfo.badge,
        xp: score * 10,
      },
    });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username, email, or LeetCode ID already exists' });
    }
    console.error('Register Error:', e);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const u = prepareGet('SELECT * FROM users WHERE email=?', [email]);
    if (!u) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, u.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const tierInfo = getTierInfo(u.total_score || 0);
    const token = jwt.sign({ userId: u.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        leetcode_id: u.leetcode_id,
        avatar_url: u.avatar_url,
        total_easy: u.total_easy,
        total_medium: u.total_medium,
        total_hard: u.total_hard,
        total_score: u.total_score,
        tier: tierInfo.tier,
        tier_badge: tierInfo.badge,
        next_score: tierInfo.nextScore,
        color: tierInfo.color,
        xp: u.xp || u.total_score * 10,
      },
    });
  } catch (e) {
    console.error('Login Error:', e);
    res.status(500).json({ error: 'Server error during login' });
  }
};

exports.getProfile = (req, res) => {
  const u = prepareGet(
    'SELECT id,username,email,leetcode_id,avatar_url,total_easy,total_medium,total_hard,total_score,tier,xp,last_synced_at,created_at FROM users WHERE id=?',
    [req.userId]
  );
  if (!u) return res.status(404).json({ error: 'User profile not found' });

  const tierInfo = getTierInfo(u.total_score || 0);
  res.json({
    user: {
      ...u,
      tier: tierInfo.tier,
      tier_badge: tierInfo.badge,
      next_score: tierInfo.nextScore,
      min_score: tierInfo.minScore,
      color: tierInfo.color,
    },
  });
};
