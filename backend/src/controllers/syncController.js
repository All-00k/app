const { prepareGet, prepareAll, prepareRun } = require('../database');
const { fetchLeetCodeStats, calculateScore } = require('../leetcode');
const { getTierInfo } = require('../utils/tier');

function createNotificationIfSolved(eventId, userId, username, oldEasy, oldMed, oldHard, newEasy, newMed, newHard) {
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

    prepareRun(
      'INSERT INTO notifications (event_id, user_id, title, message, type) VALUES (?,?,?,?,?)',
      [eventId, userId, title, message, 'solve_alert']
    );
  }
}

exports.syncUser = async (req, res) => {
  try {
    const u = prepareGet('SELECT * FROM users WHERE id=?', [Number(req.params.userId)]);
    if (!u) return res.status(404).json({ error: 'User not found' });

    const lc = await fetchLeetCodeStats(u.leetcode_id);
    const score = calculateScore(lc.stats.easy, lc.stats.medium, lc.stats.hard);
    const tierInfo = getTierInfo(score);

    prepareRun(
      "UPDATE users SET total_easy=?,total_medium=?,total_hard=?,total_score=?,tier=?,xp=?,avatar_url=?,last_synced_at=datetime('now') WHERE id=?",
      [lc.stats.easy, lc.stats.medium, lc.stats.hard, score, tierInfo.tier, score * 10, lc.avatar || '', u.id]
    );

    const parts = prepareAll(
      `SELECT ep.id,ep.event_id,ep.easy_at_join,ep.medium_at_join,ep.hard_at_join,ep.current_easy,ep.current_medium,ep.current_hard FROM event_participants ep
       JOIN events e ON ep.event_id=e.id WHERE ep.user_id=? AND e.status='active'`,
      [u.id]
    );

    const today = new Date().toISOString().split('T')[0];
    for (const p of parts) {
      const ed = lc.stats.easy - p.easy_at_join;
      const md = lc.stats.medium - p.medium_at_join;
      const hd = lc.stats.hard - p.hard_at_join;
      const es = calculateScore(ed, md, hd);

      // Trigger notification if problem count increased
      createNotificationIfSolved(
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

      prepareRun(
        'UPDATE event_participants SET current_easy=?,current_medium=?,current_hard=?,score=? WHERE id=?',
        [lc.stats.easy, lc.stats.medium, lc.stats.hard, es, p.id]
      );
      prepareRun(
        `INSERT INTO daily_progress (participant_id,date,easy_solved,medium_solved,hard_solved,daily_score) VALUES (?,?,?,?,?,?)
         ON CONFLICT(participant_id,date) DO UPDATE SET easy_solved=excluded.easy_solved,medium_solved=excluded.medium_solved,hard_solved=excluded.hard_solved,daily_score=excluded.daily_score`,
        [p.id, today, ed, md, hd, es]
      );
    }

    res.json({ message: 'User stats synced successfully', stats: lc.stats, score, tier: tierInfo.tier, badge: tierInfo.badge });
  } catch (e) {
    console.error('Sync User Error:', e);
    res.status(500).json({ error: e.message || 'Sync failed' });
  }
};

exports.syncEvent = async (req, res) => {
  try {
    const parts = prepareAll(
      'SELECT ep.*,u.leetcode_id,u.username,u.id as uid FROM event_participants ep JOIN users u ON ep.user_id=u.id WHERE ep.event_id=?',
      [Number(req.params.eventId)]
    );
    const results = [];
    const today = new Date().toISOString().split('T')[0];

    for (const p of parts) {
      try {
        const lc = await fetchLeetCodeStats(p.leetcode_id);
        const ed = lc.stats.easy - p.easy_at_join;
        const md = lc.stats.medium - p.medium_at_join;
        const hd = lc.stats.hard - p.hard_at_join;
        const es = calculateScore(ed, md, hd);
        const gs = calculateScore(lc.stats.easy, lc.stats.medium, lc.stats.hard);

        // Trigger notification if problem count increased
        createNotificationIfSolved(
          p.event_id,
          p.uid,
          p.username,
          p.current_easy || p.easy_at_join,
          p.current_medium || p.medium_at_join,
          p.current_hard || p.hard_at_join,
          lc.stats.easy,
          lc.stats.medium,
          lc.stats.hard
        );

        prepareRun(
          "UPDATE users SET total_easy=?,total_medium=?,total_hard=?,total_score=?,avatar_url=?,last_synced_at=datetime('now') WHERE id=?",
          [lc.stats.easy, lc.stats.medium, lc.stats.hard, gs, lc.avatar || '', p.uid]
        );
        prepareRun(
          'UPDATE event_participants SET current_easy=?,current_medium=?,current_hard=?,score=? WHERE id=?',
          [lc.stats.easy, lc.stats.medium, lc.stats.hard, es, p.id]
        );
        prepareRun(
          `INSERT INTO daily_progress (participant_id,date,easy_solved,medium_solved,hard_solved,daily_score) VALUES (?,?,?,?,?,?)
           ON CONFLICT(participant_id,date) DO UPDATE SET easy_solved=excluded.easy_solved,medium_solved=excluded.medium_solved,hard_solved=excluded.hard_solved,daily_score=excluded.daily_score`,
          [p.id, today, ed, md, hd, es]
        );
        results.push({ leetcode_id: p.leetcode_id, score: es, success: true });
      } catch (e) {
        results.push({ leetcode_id: p.leetcode_id, error: e.message, success: false });
      }
    }
    res.json({ results });
  } catch (e) {
    console.error('Sync Event Error:', e);
    res.status(500).json({ error: 'Sync event failed' });
  }
};
