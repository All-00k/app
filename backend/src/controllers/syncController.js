const { supabase } = require('../database');
const { fetchLeetCodeStats, calculateScore } = require('../leetcode');
const { getTierInfo } = require('../utils/tier');

async function createNotificationIfSolved(eventId, userId, username, oldEasy, oldMed, oldHard, newEasy, newMed, newHard) {
  if (!supabase) return;

  const easyDiff = newEasy - oldEasy;
  const medDiff = newMed - oldMed;
  const hardDiff = newHard - oldHard;

  if (easyDiff > 0 || medDiff > 0 || hardDiff > 0) {
    const solved = [];
    if (hardDiff > 0) solved.push(`${hardDiff} Hard 🔥 (+${hardDiff * 5} pts)`);
    if (medDiff > 0) solved.push(`${medDiff} Medium 🟡 (+${medDiff * 3} pts)`);
    if (easyDiff > 0) solved.push(`${easyDiff} Easy 🟢 (+${easyDiff * 1} pts)`);

    const title = '🔥 Problem Solved Alert!';
    const message = `⚡ ${username} just solved ${solved.join(', ')}!`;

    try {
      await supabase
        .from('notifications')
        .insert({
          event_id: eventId,
          user_id: userId,
          title,
          message,
          type: 'solve_alert',
        });
    } catch (err) {
      console.error('Notification creation error:', err.message);
    }
  }
}

exports.syncUser = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { data: u, error: uErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.userId)
      .maybeSingle();

    if (uErr || !u) return res.status(404).json({ error: 'User not found' });

    const lc = await fetchLeetCodeStats(u.leetcode_id);
    const score = calculateScore(lc.stats.easy || 0, lc.stats.medium || 0, lc.stats.hard || 0);
    const tierInfo = getTierInfo(score);

    // 1. Update user profile stats
    await supabase
      .from('users')
      .update({
        total_easy: lc.stats.easy,
        total_medium: lc.stats.medium,
        total_hard: lc.stats.hard,
        total_score: score,
        tier: tierInfo.tier,
        xp: score * 10,
        avatar_url: lc.avatar || u.avatar_url || '',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', u.id);

    // 2. Fetch active events for this user
    const { data: parts, error: partErr } = await supabase
      .from('event_participants')
      .select('*, event:events!event_id(id, status)')
      .eq('user_id', u.id);

    if (!partErr && parts) {
      const activeParts = parts.filter((p) => p.event?.status === 'active');
      const today = new Date().toISOString().split('T')[0];

      for (const p of activeParts) {
        const ed = lc.stats.easy - (p.easy_at_join || 0);
        const md = lc.stats.medium - (p.medium_at_join || 0);
        const hd = lc.stats.hard - (p.hard_at_join || 0);
        const es = calculateScore(ed, md, hd);

        // Trigger notification if problem count increased
        await createNotificationIfSolved(
          p.event_id,
          u.id,
          u.username,
          p.current_easy || p.easy_at_join,
          p.current_medium || p.medium_at_join,
          p.current_hard || p.hard_at_join,
          lc.stats.easy,
          lc.stats.medium,
          lc.stats.hard
        );

        await supabase
          .from('event_participants')
          .update({
            current_easy: lc.stats.easy,
            current_medium: lc.stats.medium,
            current_hard: lc.stats.hard,
            score: es,
          })
          .eq('id', p.id);

        await supabase
          .from('daily_progress')
          .upsert({
            participant_id: p.id,
            date: today,
            easy_solved: ed,
            medium_solved: md,
            hard_solved: hd,
            daily_score: es,
          }, { onConflict: 'participant_id,date' });
      }
    }

    return res.json({
      message: 'User stats synced successfully',
      stats: lc.stats,
      score,
      tier: tierInfo.tier,
      badge: tierInfo.badge,
    });
  } catch (e) {
    console.error('Sync User Error:', e);
    return res.status(500).json({ error: e.message || 'Sync failed' });
  }
};

exports.syncEvent = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { data: parts, error } = await supabase
      .from('event_participants')
      .select('*, user:users!user_id(*)')
      .eq('event_id', req.params.eventId);

    if (error) {
      console.error('Sync event fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch event participants' });
    }

    const results = [];
    const today = new Date().toISOString().split('T')[0];

    for (const p of parts || []) {
      if (!p.user) continue;
      try {
        const lc = await fetchLeetCodeStats(p.user.leetcode_id);
        const ed = lc.stats.easy - (p.easy_at_join || 0);
        const md = lc.stats.medium - (p.medium_at_join || 0);
        const hd = lc.stats.hard - (p.hard_at_join || 0);
        const es = calculateScore(ed, md, hd);
        const gs = calculateScore(lc.stats.easy, lc.stats.medium, lc.stats.hard);
        const tierInfo = getTierInfo(gs);

        // Trigger notification if problem count increased
        await createNotificationIfSolved(
          p.event_id,
          p.user.id,
          p.user.username,
          p.current_easy || p.easy_at_join,
          p.current_medium || p.medium_at_join,
          p.current_hard || p.hard_at_join,
          lc.stats.easy,
          lc.stats.medium,
          lc.stats.hard
        );

        await supabase
          .from('users')
          .update({
            total_easy: lc.stats.easy,
            total_medium: lc.stats.medium,
            total_hard: lc.stats.hard,
            total_score: gs,
            tier: tierInfo.tier,
            xp: gs * 10,
            avatar_url: lc.avatar || p.user.avatar_url || '',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', p.user.id);

        await supabase
          .from('event_participants')
          .update({
            current_easy: lc.stats.easy,
            current_medium: lc.stats.medium,
            current_hard: lc.stats.hard,
            score: es,
          })
          .eq('id', p.id);

        await supabase
          .from('daily_progress')
          .upsert({
            participant_id: p.id,
            date: today,
            easy_solved: ed,
            medium_solved: md,
            hard_solved: hd,
            daily_score: es,
          }, { onConflict: 'participant_id,date' });

        results.push({ leetcode_id: p.user.leetcode_id, score: es, success: true });
      } catch (e) {
        results.push({ leetcode_id: p.user?.leetcode_id, error: e.message, success: false });
      }
    }

    return res.json({ results });
  } catch (e) {
    console.error('Sync Event Error:', e);
    return res.status(500).json({ error: 'Sync event failed' });
  }
};
