const { supabase } = require('../database');
const {
  fetchCodeforcesStats,
  fetchCodeChefStats,
  fetchGFGStats,
  fetchHackerRankStats,
  calculateDPI,
  getDPITier,
} = require('../platforms');
const { fetchFullLeetCodeProfile, fetchLeetCodeStats } = require('../leetcode');

// In-memory fallback store for platform profiles if Supabase columns are pending migration
const fallbackPlatformStore = new Map();

function getCachedPlatforms(userId) {
  if (!fallbackPlatformStore.has(userId)) {
    fallbackPlatformStore.set(userId, {
      codeforces_id: '',
      codechef_id: '',
      gfg_id: '',
      hackerrank_id: '',
      platform_stats: {},
      dpi_score: 0,
      dpi_tier: 'Bronze Developer',
    });
  }
  return fallbackPlatformStore.get(userId);
}

/**
 * 1. Get Linked Platforms & DPI Profile
 */
exports.getLinkedPlatforms = async (req, res) => {
  try {
    const userId = req.userId;
    let userRow = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        userRow = data;
      }
    }

    const fallback = getCachedPlatforms(userId);

    const leetcodeId = userRow?.leetcode_id || '';
    const codeforcesId = userRow?.codeforces_id || fallback.codeforces_id || '';
    const codechefId = userRow?.codechef_id || fallback.codechef_id || '';
    const gfgId = userRow?.gfg_id || fallback.gfg_id || '';
    const hackerrankId = userRow?.hackerrank_id || fallback.hackerrank_id || '';

    let stats = userRow?.platform_stats || fallback.platform_stats || {};

    // Ensure leetcode stats exist
    if (!stats.leetcode && leetcodeId) {
      stats.leetcode = {
        platform: 'leetcode',
        handle: leetcodeId,
        total_easy: userRow?.total_easy || 0,
        total_medium: userRow?.total_medium || 0,
        total_hard: userRow?.total_hard || 0,
        total_score: userRow?.total_score || 0,
        tier: userRow?.tier || 'Novice Coder',
      };
    }

    // Calculate DPI
    const dpi = calculateDPI({
      leetcode: stats.leetcode,
      codeforces: stats.codeforces,
      codechef: stats.codechef,
      gfg: stats.gfg,
      hackerrank: stats.hackerrank,
    });

    res.json({
      success: true,
      userId,
      platforms: {
        leetcode: {
          platform: 'leetcode',
          name: 'LeetCode',
          handle: leetcodeId,
          linked: !!leetcodeId,
          icon: 'code-slash',
          color: '#FFA116',
          stats: stats.leetcode || null,
        },
        codeforces: {
          platform: 'codeforces',
          name: 'Codeforces',
          handle: codeforcesId,
          linked: !!codeforcesId,
          icon: 'analytics',
          color: '#188CE5',
          stats: stats.codeforces || null,
        },
        codechef: {
          platform: 'codechef',
          name: 'CodeChef',
          handle: codechefId,
          linked: !!codechefId,
          icon: 'restaurant',
          color: '#5B4638',
          stats: stats.codechef || null,
        },
        gfg: {
          platform: 'gfg',
          name: 'GeeksforGeeks',
          handle: gfgId,
          linked: !!gfgId,
          icon: 'leaf',
          color: '#2F8D46',
          stats: stats.gfg || null,
        },
        hackerrank: {
          platform: 'hackerrank',
          name: 'HackerRank',
          handle: hackerrankId,
          linked: !!hackerrankId,
          icon: 'terminal',
          color: '#00EA64',
          stats: stats.hackerrank || null,
        },
      },
      dpi,
    });
  } catch (err) {
    console.error('getLinkedPlatforms error:', err);
    res.status(500).json({ error: 'Failed to retrieve linked platforms.' });
  }
};

/**
 * 2. Link a Platform Handle with Live Verification
 */
exports.linkPlatform = async (req, res) => {
  try {
    const userId = req.userId;
    const { platform, handle } = req.body;

    if (!platform || !handle) {
      return res.status(400).json({ error: 'Platform and handle are required.' });
    }

    const cleanPlatform = platform.toLowerCase().trim();
    const cleanHandle = handle.trim();

    if (!['codeforces', 'codechef', 'gfg', 'hackerrank', 'leetcode'].includes(cleanPlatform)) {
      return res.status(400).json({ error: 'Unsupported platform.' });
    }

    // Verify handle existence and fetch live stats
    let platformStats = null;
    if (cleanPlatform === 'codeforces') {
      platformStats = await fetchCodeforcesStats(cleanHandle);
    } else if (cleanPlatform === 'codechef') {
      platformStats = await fetchCodeChefStats(cleanHandle);
    } else if (cleanPlatform === 'gfg') {
      platformStats = await fetchGFGStats(cleanHandle);
    } else if (cleanPlatform === 'hackerrank') {
      platformStats = await fetchHackerRankStats(cleanHandle);
    } else if (cleanPlatform === 'leetcode') {
      platformStats = await fetchFullLeetCodeProfile(cleanHandle);
    }

    if (!platformStats) {
      return res.status(404).json({
        error: `Could not verify handle "${cleanHandle}" on ${cleanPlatform}. Please check spelling or profile privacy.`,
      });
    }

    // Update in-memory fallback
    const fallback = getCachedPlatforms(userId);
    const colName = `${cleanPlatform}_id`;
    fallback[colName] = cleanHandle;
    if (!fallback.platform_stats) fallback.platform_stats = {};
    fallback.platform_stats[cleanPlatform] = platformStats;

    // Load existing stats to recompute DPI
    let userRow = null;
    if (supabase) {
      try {
        const { data } = await supabase.from('users').select('*').eq('id', userId).single();
        userRow = data;
      } catch (e) {}
    }

    const allStats = {
      ...(userRow?.platform_stats || {}),
      ...(fallback.platform_stats || {}),
    };
    allStats[cleanPlatform] = platformStats;

    if (userRow?.total_easy !== undefined) {
      allStats.leetcode = {
        platform: 'leetcode',
        handle: userRow.leetcode_id || cleanHandle,
        total_easy: userRow.total_easy,
        total_medium: userRow.total_medium,
        total_hard: userRow.total_hard,
        total_score: userRow.total_score,
        tier: userRow.tier,
      };
    }

    const dpi = calculateDPI({
      leetcode: allStats.leetcode,
      codeforces: allStats.codeforces,
      codechef: allStats.codechef,
      gfg: allStats.gfg,
      hackerrank: allStats.hackerrank,
    });

    fallback.dpi_score = dpi.dpiScore;
    fallback.dpi_tier = dpi.dpiTier;

    // Persist to Supabase if columns exist
    if (supabase) {
      try {
        const updatePayload = {
          [colName]: cleanHandle,
          platform_stats: allStats,
          dpi_score: dpi.dpiScore,
          dpi_tier: dpi.dpiTier,
        };
        await supabase.from('users').update(updatePayload).eq('id', userId);
      } catch (dbErr) {
        console.warn('Could not persist new platform columns to Supabase directly:', dbErr.message);
      }
    }

    res.json({
      success: true,
      message: `Successfully linked and verified @${cleanHandle} on ${cleanPlatform}!`,
      platform: cleanPlatform,
      handle: cleanHandle,
      stats: platformStats,
      dpi,
    });
  } catch (err) {
    console.error('linkPlatform error:', err);
    res.status(500).json({ error: 'Failed to link platform profile.' });
  }
};

/**
 * 3. Sync Platform Stats (All or Single)
 */
exports.syncPlatforms = async (req, res) => {
  try {
    const userId = req.userId;
    const { platform } = req.body || {};

    let userRow = null;
    if (supabase) {
      try {
        const { data } = await supabase.from('users').select('*').eq('id', userId).single();
        userRow = data;
      } catch (e) {}
    }

    const fallback = getCachedPlatforms(userId);

    const handles = {
      leetcode: userRow?.leetcode_id || '',
      codeforces: userRow?.codeforces_id || fallback.codeforces_id || '',
      codechef: userRow?.codechef_id || fallback.codechef_id || '',
      gfg: userRow?.gfg_id || fallback.gfg_id || '',
      hackerrank: userRow?.hackerrank_id || fallback.hackerrank_id || '',
    };

    const currentStats = {
      ...(userRow?.platform_stats || {}),
      ...(fallback.platform_stats || {}),
    };

    const targetPlatforms = platform ? [platform.toLowerCase().trim()] : ['leetcode', 'codeforces', 'codechef', 'gfg', 'hackerrank'];

    const syncPromises = targetPlatforms.map(async (p) => {
      const handle = handles[p];
      if (!handle) return;

      try {
        if (p === 'codeforces') {
          const stats = await fetchCodeforcesStats(handle);
          if (stats) currentStats.codeforces = stats;
        } else if (p === 'codechef') {
          const stats = await fetchCodeChefStats(handle);
          if (stats) currentStats.codechef = stats;
        } else if (p === 'gfg') {
          const stats = await fetchGFGStats(handle);
          if (stats) currentStats.gfg = stats;
        } else if (p === 'hackerrank') {
          const stats = await fetchHackerRankStats(handle);
          if (stats) currentStats.hackerrank = stats;
        } else if (p === 'leetcode') {
          const stats = await fetchFullLeetCodeProfile(handle);
          if (stats) currentStats.leetcode = stats;
        }
      } catch (pErr) {
        console.warn(`Sync error for ${p} (${handle}):`, pErr.message);
      }
    });

    await Promise.all(syncPromises);

    const dpi = calculateDPI({
      leetcode: currentStats.leetcode,
      codeforces: currentStats.codeforces,
      codechef: currentStats.codechef,
      gfg: currentStats.gfg,
      hackerrank: currentStats.hackerrank,
    });

    fallback.platform_stats = currentStats;
    fallback.dpi_score = dpi.dpiScore;
    fallback.dpi_tier = dpi.dpiTier;

    if (supabase) {
      try {
        await supabase
          .from('users')
          .update({
            platform_stats: currentStats,
            dpi_score: dpi.dpiScore,
            dpi_tier: dpi.dpiTier,
          })
          .eq('id', userId);
      } catch (dbErr) {}
    }

    res.json({
      success: true,
      message: 'All platform statistics synchronized successfully!',
      stats: currentStats,
      dpi,
    });
  } catch (err) {
    console.error('syncPlatforms error:', err);
    res.status(500).json({ error: 'Failed to sync platform stats.' });
  }
};

/**
 * 4. Unlink a Platform
 */
exports.unlinkPlatform = async (req, res) => {
  try {
    const userId = req.userId;
    const { platform } = req.params;

    if (!platform) {
      return res.status(400).json({ error: 'Platform parameter is required.' });
    }

    const cleanPlatform = platform.toLowerCase().trim();
    if (cleanPlatform === 'leetcode') {
      return res.status(400).json({ error: 'Primary LeetCode account cannot be unlinked.' });
    }

    const fallback = getCachedPlatforms(userId);
    const colName = `${cleanPlatform}_id`;
    fallback[colName] = '';
    if (fallback.platform_stats) {
      delete fallback.platform_stats[cleanPlatform];
    }

    let userRow = null;
    if (supabase) {
      try {
        const { data } = await supabase.from('users').select('*').eq('id', userId).single();
        userRow = data;
      } catch (e) {}
    }

    const stats = {
      ...(userRow?.platform_stats || {}),
      ...(fallback.platform_stats || {}),
    };
    delete stats[cleanPlatform];

    const dpi = calculateDPI({
      leetcode: stats.leetcode,
      codeforces: stats.codeforces,
      codechef: stats.codechef,
      gfg: stats.gfg,
      hackerrank: stats.hackerrank,
    });

    fallback.dpi_score = dpi.dpiScore;
    fallback.dpi_tier = dpi.dpiTier;

    if (supabase) {
      try {
        await supabase
          .from('users')
          .update({
            [colName]: '',
            platform_stats: stats,
            dpi_score: dpi.dpiScore,
            dpi_tier: dpi.dpiTier,
          })
          .eq('id', userId);
      } catch (dbErr) {}
    }

    res.json({
      success: true,
      message: `Unlinked ${cleanPlatform} successfully.`,
      dpi,
    });
  } catch (err) {
    console.error('unlinkPlatform error:', err);
    res.status(500).json({ error: 'Failed to unlink platform.' });
  }
};

/**
 * 5. Global Developer Power Index (DPI) Leaderboard
 */
exports.getDPILeaderboard = async (req, res) => {
  try {
    let usersList = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, avatar_url, leetcode_id, total_score, total_easy, total_medium, total_hard, tier, dpi_score, dpi_tier, platform_stats, codeforces_id, codechef_id, gfg_id, hackerrank_id')
          .order('dpi_score', { ascending: false })
          .limit(100);

        if (!error && data) {
          usersList = data;
        }
      } catch (e) {}
    }

    // Process and enrich rankings
    const leaderboard = usersList.map((u, index) => {
      const fallback = fallbackPlatformStore.get(u.id);
      const stats = u.platform_stats || fallback?.platform_stats || {};
      const leetcodeStats = {
        total_easy: u.total_easy || 0,
        total_medium: u.total_medium || 0,
        total_hard: u.total_hard || 0,
        total_score: u.total_score || 0,
      };

      const dpi = calculateDPI({
        leetcode: stats.leetcode || leetcodeStats,
        codeforces: stats.codeforces,
        codechef: stats.codechef,
        gfg: stats.gfg,
        hackerrank: stats.hackerrank,
      });

      const finalDpiScore = u.dpi_score || dpi.dpiScore || (u.total_score * 10);
      const tierObj = getDPITier(finalDpiScore);

      const activePlatforms = ['leetcode'];
      if (u.codeforces_id || fallback?.codeforces_id || stats.codeforces) activePlatforms.push('codeforces');
      if (u.codechef_id || fallback?.codechef_id || stats.codechef) activePlatforms.push('codechef');
      if (u.gfg_id || fallback?.gfg_id || stats.gfg) activePlatforms.push('gfg');
      if (u.hackerrank_id || fallback?.hackerrank_id || stats.hackerrank) activePlatforms.push('hackerrank');

      return {
        rank: index + 1,
        id: u.id,
        username: u.username,
        avatar_url: u.avatar_url,
        leetcode_id: u.leetcode_id,
        dpi_score: finalDpiScore,
        dpi_tier: tierObj.title,
        dpi_badge: tierObj.badge,
        dpi_color: tierObj.color,
        active_platforms: activePlatforms,
        breakdown: dpi.breakdown,
      };
    });

    // Sort descending by final DPI score
    leaderboard.sort((a, b) => b.dpi_score - a.dpi_score);
    leaderboard.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    res.json({
      success: true,
      leaderboard,
      totalParticipants: leaderboard.length,
    });
  } catch (err) {
    console.error('getDPILeaderboard error:', err);
    res.status(500).json({ error: 'Failed to retrieve DPI leaderboard.' });
  }
};
