const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { supabase } = require('../database');
const { fetchLeetCodeStats, calculateScore } = require('../leetcode');
const { getTierInfo } = require('../utils/tier');

exports.register = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_KEY in backend/.env',
      });
    }

    const { username, email, password, leetcode_id } = req.body;

    if (!username || !email || !password || !leetcode_id) {
      return res.status(400).json({ error: 'All fields are required (username, email, password, leetcode_id)' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();
    const normalizedLeetcodeId = leetcode_id.trim();

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // 1. Check for existing unique email
    const { data: existingEmail, error: emailErr } = await supabase
      .from('users')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (emailErr) {
      console.error('Supabase Email Check Error:', emailErr);
      return res.status(500).json({ error: 'Database error checking existing email: ' + emailErr.message });
    }

    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in instead.' });
    }

    // 2. Check for existing unique username
    const { data: existingUsername, error: userErr } = await supabase
      .from('users')
      .select('id')
      .ilike('username', normalizedUsername)
      .maybeSingle();

    if (userErr) {
      console.error('Supabase Username Check Error:', userErr);
      return res.status(500).json({ error: 'Database error checking existing username: ' + userErr.message });
    }

    if (existingUsername) {
      return res.status(409).json({ error: 'Username is already taken. Please choose a different username.' });
    }

    // 3. Check for existing unique LeetCode ID
    const { data: existingLeetcode, error: lcErr } = await supabase
      .from('users')
      .select('id')
      .ilike('leetcode_id', normalizedLeetcodeId)
      .maybeSingle();

    if (lcErr) {
      console.error('Supabase LeetCode Check Error:', lcErr);
      return res.status(500).json({ error: 'Database error checking LeetCode ID: ' + lcErr.message });
    }

    if (existingLeetcode) {
      return res.status(409).json({ error: 'This LeetCode ID is already linked to an existing CodeArena account.' });
    }

    // 4. Verify LeetCode account & fetch baseline stats
    let lc;
    try {
      lc = await fetchLeetCodeStats(normalizedLeetcodeId);
    } catch (e) {
      return res.status(400).json({ error: `Invalid LeetCode username: ${e.message}` });
    }

    // 5. Hash password & calculate initial score & tier
    const hash = await bcrypt.hash(password, 10);
    const score = calculateScore(lc.stats.easy || 0, lc.stats.medium || 0, lc.stats.hard || 0);
    const tierInfo = getTierInfo(score);

    // 6. Save new user in Supabase
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        username: normalizedUsername,
        email: normalizedEmail,
        password_hash: hash,
        leetcode_id: normalizedLeetcodeId,
        avatar_url: lc.avatar || '',
        total_easy: lc.stats.easy || 0,
        total_medium: lc.stats.medium || 0,
        total_hard: lc.stats.hard || 0,
        total_score: score || 0,
        tier: tierInfo.tier,
        xp: (score || 0) * 10,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Supabase User Insert Error:', insertErr);
      if (insertErr.code === '23505' || insertErr.message?.includes('duplicate key') || insertErr.message?.includes('unique')) {
        if (insertErr.message?.includes('email')) {
          return res.status(409).json({ error: 'An account with this email address already exists' });
        }
        if (insertErr.message?.includes('username')) {
          return res.status(409).json({ error: 'This username is already taken' });
        }
        if (insertErr.message?.includes('leetcode_id')) {
          return res.status(409).json({ error: 'This LeetCode ID is already registered' });
        }
        return res.status(409).json({ error: 'A user with these unique credentials already exists' });
      }
      return res.status(500).json({ error: 'Database error during registration: ' + insertErr.message });
    }

    // 7. Generate JWT token
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        leetcode_id: newUser.leetcode_id,
        avatar_url: newUser.avatar_url || '',
        total_easy: newUser.total_easy,
        total_medium: newUser.total_medium,
        total_hard: newUser.total_hard,
        total_score: newUser.total_score,
        tier: tierInfo.tier,
        tier_badge: tierInfo.badge,
        xp: newUser.xp,
      },
    });
  } catch (e) {
    console.error('Register Error:', e);
    return res.status(500).json({ error: e.message || 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_KEY in backend/.env',
      });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const identifier = email.trim().toLowerCase();

    // Query user by email OR username (case insensitive)
    const { data: u, error: uErr } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.${identifier},username.ilike.${identifier}`)
      .maybeSingle();

    if (uErr) {
      console.error('Supabase Login Query Error:', uErr);
      return res.status(500).json({ error: 'Database error during login' });
    }

    if (!u) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, u.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tierInfo = getTierInfo(u.total_score || 0);
    const token = jwt.sign({ userId: u.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      token,
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        leetcode_id: u.leetcode_id,
        avatar_url: u.avatar_url || '',
        total_easy: u.total_easy,
        total_medium: u.total_medium,
        total_hard: u.total_hard,
        total_score: u.total_score,
        tier: tierInfo.tier,
        tier_badge: tierInfo.badge,
        next_score: tierInfo.nextScore,
        color: tierInfo.color,
        xp: u.xp || (u.total_score * 10),
      },
    });
  } catch (e) {
    console.error('Login Error:', e);
    return res.status(500).json({ error: e.message || 'Server error during login' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_KEY in backend/.env',
      });
    }

    const { data: u, error } = await supabase
      .from('users')
      .select('id, username, email, leetcode_id, avatar_url, total_easy, total_medium, total_hard, total_score, tier, xp, last_synced_at, created_at')
      .eq('id', req.userId)
      .maybeSingle();

    if (error || !u) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const tierInfo = getTierInfo(u.total_score || 0);
    return res.json({
      user: {
        ...u,
        tier: tierInfo.tier,
        tier_badge: tierInfo.badge,
        next_score: tierInfo.nextScore,
        min_score: tierInfo.minScore,
        color: tierInfo.color,
      },
    });
  } catch (e) {
    console.error('Get Profile Error:', e);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};
