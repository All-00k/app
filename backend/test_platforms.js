const axios = require('axios');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./src/config');
const { supabase } = require('./src/database');

const API = 'http://localhost:3001/api';

function assert(testName, condition, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName} ${details}`);
  } else {
    console.error(`❌ [FAIL] ${testName} ${details}`);
    throw new Error(`Assertion failed for: ${testName}`);
  }
}

async function runPlatformTests() {
  console.log('====================================================');
  console.log('🧪 TESTING CODEARENA MULTI-PLATFORM & DPI ENGINE');
  console.log('====================================================\n');

  // 1. Health check
  try {
    const health = await axios.get(`${API}/health`);
    assert('1. Server Health Check', health.data.status === 'live', `(Database: ${health.data.database})`);
  } catch (err) {
    console.error('❌ Server is not running on http://localhost:3001.');
    return;
  }

  // 2. Obtain test token
  const token = jwt.sign({ userId: 1, email: 'alok11@gmail.com' }, JWT_SECRET, { expiresIn: '1d' });
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 3. Link Codeforces handle
  console.log('\n--- Testing Platform Linking ---');
  try {
    const cfLinkRes = await axios.post(`${API}/platforms/link`, {
      platform: 'codeforces',
      handle: 'tourist',
    }, { headers: authHeaders });

    assert(
      '2. Link Codeforces Handle (tourist)',
      cfLinkRes.data.success && cfLinkRes.data.stats.rating > 3000,
      `-> Rating: ${cfLinkRes.data.stats.rating}, Rank: ${cfLinkRes.data.stats.rank}, Solved: ${cfLinkRes.data.stats.totalSolved}`
    );
  } catch (err) {
    console.warn('CF link warning:', err.response?.data?.error || err.message);
  }

  // 4. Link HackerRank handle
  try {
    const hrLinkRes = await axios.post(`${API}/platforms/link`, {
      platform: 'hackerrank',
      handle: 'tourist',
    }, { headers: authHeaders });

    assert(
      '3. Link HackerRank Handle (tourist)',
      hrLinkRes.data.success && hrLinkRes.data.stats.handle === 'tourist',
      `-> Level: ${hrLinkRes.data.stats.level}, Badges: ${hrLinkRes.data.stats.badgesCount}`
    );
  } catch (err) {
    console.warn('HackerRank link warning:', err.response?.data?.error || err.message);
  }

  // 5. Get Linked Platforms & DPI Profile
  console.log('\n--- Testing DPI Calculation ---');
  try {
    const platformsRes = await axios.get(`${API}/platforms`, { headers: authHeaders });
    const { platforms, dpi } = platformsRes.data;

    assert(
      '4. Get Linked Platforms & DPI Profile',
      platformsRes.data.success && dpi.dpiScore > 0,
      `-> DPI Score: ${dpi.dpiScore} (${dpi.dpiTier} ${dpi.dpiBadge})`
    );
    console.log('   Breakdown:', JSON.stringify(dpi.breakdown, null, 2));
  } catch (err) {
    assert('4. Get Linked Platforms', false, err.response?.data?.error || err.message);
  }

  // 6. Force Sync Platforms
  console.log('\n--- Testing Platform Synchronization ---');
  try {
    const syncRes = await axios.post(`${API}/platforms/sync`, {}, { headers: authHeaders });
    assert(
      '5. Sync All Platforms',
      syncRes.data.success && syncRes.data.dpi.dpiScore > 0,
      `-> Synced score: ${syncRes.data.dpi.dpiScore}`
    );
  } catch (err) {
    assert('5. Sync All Platforms', false, err.response?.data?.error || err.message);
  }

  // 7. Global DPI Leaderboard
  console.log('\n--- Testing DPI Leaderboard ---');
  try {
    const boardRes = await axios.get(`${API}/platforms/leaderboard`);
    assert(
      '6. Global Developer Power Index Leaderboard',
      boardRes.data.success && Array.isArray(boardRes.data.leaderboard),
      `-> Total Ranked: ${boardRes.data.leaderboard.length}`
    );
    if (boardRes.data.leaderboard[0]) {
      const top = boardRes.data.leaderboard[0];
      console.log(`   #1 Rank: ${top.username || 'Coder'} with ${top.dpi_score} DPI (${top.dpi_tier})`);
    }
  } catch (err) {
    assert('6. Global DPI Leaderboard', false, err.response?.data?.error || err.message);
  }

  // 8. Test Head-to-Head Comparison with Multi-Platform Matrix
  console.log('\n--- Testing Multi-Platform Head-to-Head Comparison ---');
  try {
    const compRes = await axios.get(`${API}/friends/compare/2`, { headers: authHeaders });
    assert(
      '7. Multi-Platform Head-to-Head Comparison',
      compRes.data.multiPlatform !== undefined && Array.isArray(compRes.data.multiPlatform.platforms),
      `-> User Wins: ${compRes.data.multiPlatform.userWins}, Friend Wins: ${compRes.data.multiPlatform.friendWins}, DPI Delta: ${compRes.data.multiPlatform.dpiDelta}`
    );
  } catch (err) {
    console.log('   (Note: Friend ID 2 comparison check: ' + (err.response?.data?.error || err.message) + ')');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL MULTI-PLATFORM BACKEND TESTS COMPLETED!');
  console.log('====================================================\n');
}

runPlatformTests();
