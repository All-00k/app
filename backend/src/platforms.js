const axios = require('axios');
const { fetchFullLeetCodeProfile, fetchLeetCodeStats } = require('./leetcode');

// ==============================================================================
// 🌐 MULTI-PLATFORM SCRAPERS & REST CLIENTS
// ==============================================================================

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 1. Fetch Codeforces Profile & Problem Solves
 */
async function fetchCodeforcesStats(handle) {
  if (!handle || typeof handle !== 'string') return null;
  const cleanHandle = handle.trim();
  if (!cleanHandle) return null;

  try {
    const infoRes = await axios.get(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(cleanHandle)}`, {
      timeout: 8000,
    });

    if (infoRes.data.status !== 'OK' || !infoRes.data.result?.[0]) {
      return null;
    }

    const u = infoRes.data.result[0];

    // Fetch user solved problems count
    let totalSolved = 0;
    try {
      const statusRes = await axios.get(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(cleanHandle)}&from=1&count=5000`, {
        timeout: 8000,
      });
      if (statusRes.data.status === 'OK' && Array.isArray(statusRes.data.result)) {
        const solvedSet = new Set();
        for (const sub of statusRes.data.result) {
          if (sub.verdict === 'OK' && sub.problem) {
            const pid = `${sub.problem.contestId || ''}_${sub.problem.index || ''}_${sub.problem.name || ''}`;
            solvedSet.add(pid);
          }
        }
        totalSolved = solvedSet.size;
      }
    } catch (subErr) {
      // Submissions fetch is non-fatal; fallback to estimated or 0
      console.warn(`[Codeforces] Failed to fetch submissions for ${cleanHandle}:`, subErr.message);
    }

    return {
      platform: 'codeforces',
      handle: u.handle,
      rating: u.rating || 0,
      maxRating: u.maxRating || 0,
      rank: u.rank || 'Unrated',
      maxRank: u.maxRank || 'Unrated',
      contribution: u.contribution || 0,
      totalSolved,
      avatar: u.titlePhoto || u.avatar || '',
      profileUrl: `https://codeforces.com/profile/${u.handle}`,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`[Codeforces] Fetch error for ${cleanHandle}:`, err.message);
    return null;
  }
}

/**
 * 2. Fetch CodeChef Profile & Stars
 */
async function fetchCodeChefStats(handle) {
  if (!handle || typeof handle !== 'string') return null;
  const cleanHandle = handle.trim();
  if (!cleanHandle) return null;

  try {
    const res = await axios.get(`https://www.codechef.com/users/${encodeURIComponent(cleanHandle)}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 8000,
    });

    const html = res.data;
    if (typeof html !== 'string' || html.includes('Page Not Found') || html.includes('User does not exist')) {
      return null;
    }

    // Extract rating
    const ratingMatch = html.match(/<div class="rating-number">([^<]+)<\/div>/i) || html.match(/class="rating">([^<]+)<\/div>/i);
    const rating = ratingMatch ? parseInt(ratingMatch[1].trim(), 10) : 0;

    // Calculate stars from rating
    let stars = '1★';
    if (rating >= 2500) stars = '7★';
    else if (rating >= 2200) stars = '6★';
    else if (rating >= 2000) stars = '5★';
    else if (rating >= 1800) stars = '4★';
    else if (rating >= 1600) stars = '3★';
    else if (rating >= 1400) stars = '2★';
    else stars = '1★';

    // Global & Country rank
    const globalRankMatch = html.match(/<a href="\/ratings\/all"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/i) || html.match(/Global Rank[\s\S]*?<strong>([^<]+)<\/strong>/i);
    const globalRank = globalRankMatch && !isNaN(parseInt(globalRankMatch[1].trim(), 10)) ? parseInt(globalRankMatch[1].trim(), 10) : null;

    // Problems Solved
    const solvedMatch = html.match(/<h3>Total Problems Solved:\s*([0-9]+)<\/h3>/i) || html.match(/Problems Solved[\s\S]*?<h3>([0-9]+)<\/h3>/i) || html.match(/problems_solved[\s\S]*?([0-9]+)/i);
    const totalSolved = solvedMatch ? parseInt(solvedMatch[1].trim(), 10) : 0;

    return {
      platform: 'codechef',
      handle: cleanHandle,
      rating,
      stars,
      globalRank,
      totalSolved,
      profileUrl: `https://www.codechef.com/users/${cleanHandle}`,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`[CodeChef] Fetch error for ${cleanHandle}:`, err.message);
    return null;
  }
}

/**
 * 3. Fetch GeeksforGeeks Profile & Problem Solves
 */
async function fetchGFGStats(handle) {
  if (!handle || typeof handle !== 'string') return null;
  const cleanHandle = handle.trim();
  if (!cleanHandle) return null;

  try {
    const res = await axios.get(`https://www.geeksforgeeks.org/user/${encodeURIComponent(cleanHandle)}/`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 8000,
    });

    const html = res.data;
    if (typeof html !== 'string' || html.includes('404 Not Found') || html.includes('User Not Found')) {
      return null;
    }

    // Extract Next.js payload
    const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
    let match;
    let fullJsonStr = '';

    while ((match = regex.exec(html)) !== null) {
      let chunk = match[1];
      chunk = chunk.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      fullJsonStr += chunk;
    }

    const scoreMatch = fullJsonStr.match(/"score":([0-9]+)/) || fullJsonStr.match(/"coding_score":([0-9]+)/);
    const totalSolvedMatch = fullJsonStr.match(/"total_problems_solved":([0-9]+)/) || fullJsonStr.match(/"totalProblemsSolved":([0-9]+)/);
    const streakMatch = fullJsonStr.match(/"pod_solved_current_streak":([0-9]+)/) || fullJsonStr.match(/"pod_streak_count":([0-9]+)/);
    const instRankMatch = fullJsonStr.match(/"institute_rank":([0-9]+)/);

    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const totalSolved = totalSolvedMatch ? parseInt(totalSolvedMatch[1], 10) : 0;
    const currentStreak = streakMatch ? parseInt(streakMatch[1], 10) : 0;
    const instituteRank = instRankMatch ? parseInt(instRankMatch[1], 10) : null;

    return {
      platform: 'gfg',
      handle: cleanHandle,
      score,
      totalSolved,
      currentStreak,
      instituteRank,
      profileUrl: `https://www.geeksforgeeks.org/user/${cleanHandle}/`,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`[GFG] Fetch error for ${cleanHandle}:`, err.message);
    return null;
  }
}

/**
 * 4. Fetch HackerRank Profile & Badges
 */
async function fetchHackerRankStats(handle) {
  if (!handle || typeof handle !== 'string') return null;
  const cleanHandle = handle.trim();
  if (!cleanHandle) return null;

  try {
    const res = await axios.get(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(cleanHandle)}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: 8000,
    });

    if (!res.data || !res.data.model) {
      return null;
    }

    const m = res.data.model;

    // Fetch badges
    let badgesCount = 0;
    let topBadges = [];
    try {
      const badgeRes = await axios.get(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(cleanHandle)}/badges`, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 6000,
      });
      if (Array.isArray(badgeRes.data?.models)) {
        badgesCount = badgeRes.data.models.length;
        topBadges = badgeRes.data.models.map(b => ({
          badge_name: b.badge_name || b.badge_type,
          stars: b.stars || 1,
          icon: b.icon || '',
        }));
      }
    } catch (bErr) {
      // Badges fetch is optional
    }

    return {
      platform: 'hackerrank',
      handle: m.username || cleanHandle,
      level: m.level || 1,
      rank: m.rank || 'Coder',
      badgesCount,
      topBadges,
      avatar: m.avatar || '',
      profileUrl: `https://www.hackerrank.com/profile/${cleanHandle}`,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`[HackerRank] Fetch error for ${cleanHandle}:`, err.message);
    return null;
  }
}

// ==============================================================================
// ⚡ DEVELOPER POWER INDEX (DPI) SCORING FORMULA
// ==============================================================================

/**
 * Computes unified Developer Power Index across all active platforms
 */
function calculateDPI({ leetcode, codeforces, codechef, gfg, hackerrank }) {
  let score = 0;
  const breakdown = {
    leetcodeScore: 0,
    codeforcesScore: 0,
    codechefScore: 0,
    gfgScore: 0,
    hackerrankScore: 0,
  };

  // 1. LeetCode Contribution (Easy=1, Medium=3, Hard=5, Contest Bonus)
  if (leetcode) {
    const easy = leetcode.total_easy || leetcode.easy || 0;
    const medium = leetcode.total_medium || leetcode.medium || 0;
    const hard = leetcode.total_hard || leetcode.hard || 0;
    const solvesScore = (easy * 2) + (medium * 6) + (hard * 15);
    const contestRating = leetcode.contest_rating || leetcode.rating || 0;
    const contestBonus = contestRating > 1500 ? Math.round((contestRating - 1500) * 1.5) : 0;
    breakdown.leetcodeScore = solvesScore + contestBonus;
    score += breakdown.leetcodeScore;
  }

  // 2. Codeforces Contribution (Rating * 1.5 + Solves * 3)
  if (codeforces && codeforces.rating) {
    const ratingScore = Math.round(codeforces.rating * 1.5);
    const solveScore = (codeforces.totalSolved || 0) * 3;
    breakdown.codeforcesScore = ratingScore + solveScore;
    score += breakdown.codeforcesScore;
  }

  // 3. CodeChef Contribution (Rating * 1.2 + Solves * 2.5)
  if (codechef && codechef.rating) {
    const ratingScore = Math.round(codechef.rating * 1.2);
    const solveScore = (codechef.totalSolved || 0) * 2;
    breakdown.codechefScore = ratingScore + solveScore;
    score += breakdown.codechefScore;
  }

  // 4. GeeksforGeeks Contribution (Coding Score * 1.0 + Solves * 2 + Streak Bonus)
  if (gfg) {
    const codingScore = (gfg.score || 0);
    const solveScore = (gfg.totalSolved || 0) * 2;
    const streakBonus = (gfg.currentStreak || 0) * 15;
    breakdown.gfgScore = codingScore + solveScore + streakBonus;
    score += breakdown.gfgScore;
  }

  // 5. HackerRank Contribution (Badges * 100 + Level * 80)
  if (hackerrank) {
    const badgeScore = (hackerrank.badgesCount || 0) * 100;
    const levelScore = (hackerrank.level || 1) * 80;
    breakdown.hackerrankScore = badgeScore + levelScore;
    score += breakdown.hackerrankScore;
  }

  const dpiTier = getDPITier(score);

  return {
    dpiScore: Math.round(score),
    dpiTier: dpiTier.title,
    dpiBadge: dpiTier.badge,
    dpiColor: dpiTier.color,
    breakdown,
  };
}

/**
 * Assigns Developer Tier and Rank Badge based on DPI Score
 */
function getDPITier(score) {
  if (score >= 9000) {
    return { title: 'Legendary Titan', badge: '👑', color: '#F59E0B', min: 9000, next: null };
  }
  if (score >= 5000) {
    return { title: 'Diamond Grandmaster', badge: '💎', color: '#8B5CF6', min: 5000, next: 9000 };
  }
  if (score >= 2500) {
    return { title: 'Gold Challenger', badge: '🥇', color: '#EAB308', min: 2500, next: 5000 };
  }
  if (score >= 1000) {
    return { title: 'Silver Architect', badge: '🥈', color: '#06B6D4', min: 1000, next: 2500 };
  }
  return { title: 'Bronze Developer', badge: '🥉', color: '#64748B', min: 0, next: 1000 };
}

module.exports = {
  fetchCodeforcesStats,
  fetchCodeChefStats,
  fetchGFGStats,
  fetchHackerRankStats,
  calculateDPI,
  getDPITier,
};
