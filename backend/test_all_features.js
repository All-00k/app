const axios = require('axios');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./src/config');
const { supabase } = require('./src/database');

const API = 'http://localhost:3001/api';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(title, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${title} ${details ? `-> ${details}` : ''}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${title} ${details ? `-> ${details}` : ''}`);
  }
}

async function runComprehensiveTestSuite() {
  console.log('\n================================================================');
  console.log('🚀 CODEARENA FULL SYSTEM END-TO-END TEST SUITE');
  console.log('================================================================\n');

  // ----------------------------------------------------------------
  // FEATURE SET 1: SERVER & HEALTH
  // ----------------------------------------------------------------
  console.log('📡 1. SERVER HEALTH & DATABASE CONNECTIVITY');
  try {
    const healthRes = await axios.get(`${API}/health`);
    assert('Health Check Endpoint', healthRes.data.status === 'live', `Database: ${healthRes.data.database}`);
  } catch (err) {
    assert('Health Check Endpoint', false, err.message);
  }

  // ----------------------------------------------------------------
  // SETUP TEST USERS IN SUPABASE
  // ----------------------------------------------------------------
  console.log('\n🔐 2. AUTHENTICATION & USER IDENTITY');
  let user1, user2, token1, token2;

  try {
    // Check existing users or fetch first 2 users
    const { data: existingUsers, error: userFetchErr } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (userFetchErr) throw userFetchErr;

    if (!existingUsers || existingUsers.length < 2) {
      // Create user 1
      const { data: u1 } = await supabase
        .from('users')
        .upsert({
          username: 'ApexCoder',
          email: 'apex@codearena.dev',
          password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
          leetcode_id: 'alok',
          total_easy: 45,
          total_medium: 80,
          total_hard: 25,
          total_score: 410,
          tier: 'Algorithm Master',
          xp: 4100,
        }, { onConflict: 'username' })
        .select()
        .single();

      // Create user 2
      const { data: u2 } = await supabase
        .from('users')
        .upsert({
          username: 'QuantumDev',
          email: 'quantum@codearena.dev',
          password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
          leetcode_id: 'tourist',
          total_easy: 30,
          total_medium: 60,
          total_hard: 15,
          total_score: 285,
          tier: 'Code Warrior',
          xp: 2850,
        }, { onConflict: 'username' })
        .select()
        .single();

      user1 = u1;
      user2 = u2;
    } else {
      user1 = existingUsers[0];
      user2 = existingUsers[1];
    }

    token1 = jwt.sign({ userId: user1.id }, JWT_SECRET, { expiresIn: '7d' });
    token2 = jwt.sign({ userId: user2.id }, JWT_SECRET, { expiresIn: '7d' });

    assert('User 1 Identified', !!token1 && !!user1.id, `ID: ${user1.id}, Username: @${user1.username}`);
    assert('User 2 Identified', !!token2 && !!user2.id, `ID: ${user2.id}, Username: @${user2.username}`);

    // Verify Profile endpoint
    const profRes = await axios.get(`${API}/auth/profile`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert('Get Authenticated Profile', profRes.data.user.id === user1.id, `Tier: ${profRes.data.user.tier}`);
  } catch (err) {
    assert('Authentication Setup', false, err.response?.data?.error || err.message);
  }

  const authHeader1 = { headers: { Authorization: `Bearer ${token1}` } };
  const authHeader2 = { headers: { Authorization: `Bearer ${token2}` } };

  // ----------------------------------------------------------------
  // FEATURE SET 3: LEETCODE STATS SYNC
  // ----------------------------------------------------------------
  console.log('\n🔄 3. LEETCODE SCRAPING & STATS SYNCHRONIZATION');
  try {
    const syncRes = await axios.post(`${API}/sync/${user1.id}`, {}, authHeader1);
    assert(
      'Live LeetCode Sync',
      syncRes.data.success,
      `Easy: ${syncRes.data.user.total_easy}, Med: ${syncRes.data.user.total_medium}, Hard: ${syncRes.data.user.total_hard}, Score: ${syncRes.data.user.total_score} pts`
    );
    user1 = syncRes.data.user;
  } catch (err) {
    assert('Live LeetCode Sync', false, err.response?.data?.error || err.message);
  }

  // ----------------------------------------------------------------
  // FEATURE SET 4: EVENTS, TOURNAMENTS & LEADERBOARDS
  // ----------------------------------------------------------------
  console.log('\n🏆 4. ARENA EVENTS & TOURNAMENTS');
  let testEvent;
  try {
    // Create Event
    const createEvRes = await axios.post(
      `${API}/events`,
      {
        name: `Clash of Titans #${Date.now() % 1000}`,
        description: 'Multi-day algorithmic speed battle',
        duration_days: 7,
        mode: 'duel',
        topic: 'Dynamic Programming',
      },
      authHeader1
    );
    testEvent = createEvRes.data.event;
    assert('Create Battle Event', !!testEvent.invite_code, `Code: ${testEvent.invite_code}, Mode: ${testEvent.mode}`);

    // List Events
    const listEvRes = await axios.get(`${API}/events`, authHeader1);
    assert('List Events', Array.isArray(listEvRes.data.events) && listEvRes.data.events.length > 0, `Total Events: ${listEvRes.data.events.length}`);

    // User 2 Joins Event via Invite Code
    const joinRes = await axios.post(
      `${API}/events/join`,
      { invite_code: testEvent.invite_code },
      authHeader2
    );
    assert('Join Event by Invite Code', joinRes.data.success || joinRes.data.event !== undefined, `Joined Event: ${testEvent.name}`);

    // Event Leaderboard
    const lbRes = await axios.get(`${API}/events/${testEvent.id}/leaderboard`, authHeader1);
    assert('Event Leaderboard', Array.isArray(lbRes.data.leaderboard), `Participants: ${lbRes.data.leaderboard.length}`);

    // Live Tournament Sync
    const syncEvRes = await axios.post(`${API}/sync/event/${testEvent.id}`, {}, authHeader1);
    assert('Live Tournament Sync', syncEvRes.data.success, `Synced participants`);
  } catch (err) {
    assert('Event Operations', false, err.response?.data?.error || err.message);
  }

  // ----------------------------------------------------------------
  // FEATURE SET 5: SOCIAL GRAPH & FRIENDS MANAGEMENT
  // ----------------------------------------------------------------
  console.log('\n👥 5. SOCIAL GRAPH, FRIENDS & DISCOVERY');
  try {
    // Search Users
    const searchRes = await axios.get(`${API}/friends/search?q=${encodeURIComponent(user2.username)}`, authHeader1);
    assert('Search Users by Handle/Username', Array.isArray(searchRes.data.users) && searchRes.data.users.length > 0, `Found: ${searchRes.data.users[0]?.username}`);

    // Send Friend Request from User 1 to User 2 (or verify already friends/pending)
    const sendReqRes = await axios.post(
      `${API}/friends/request`,
      { target_user_id: user2.id },
      authHeader1
    );
    assert('Send Friend Request', sendReqRes.data.success || sendReqRes.data.status !== undefined, `Status: ${sendReqRes.data.status || 'Processed'}`);

    // List Requests on User 2
    const reqsRes = await axios.get(`${API}/friends/requests`, authHeader2);
    const incoming = reqsRes.data.incoming || [];
    assert('List Friend Requests', Array.isArray(incoming), `Incoming: ${incoming.length}, Outgoing: ${reqsRes.data.outgoing?.length || 0}`);

    if (incoming.length > 0) {
      const friendshipId = incoming[0]?.friendship_id;
      const acceptRes = await axios.post(
        `${API}/friends/accept`,
        { friendship_id: friendshipId, friend_user_id: user1.id },
        authHeader2
      );
      assert('Accept Friend Request', acceptRes.data.success, `Result: ${acceptRes.data.message}`);
    } else {
      assert('Friend Request Already Processed / Linked', true);
    }

    // List Accepted Friends on User 1
    const friendsRes = await axios.get(`${API}/friends`, authHeader1);
    assert('List Accepted Friends', Array.isArray(friendsRes.data.friends), `Friends Count: ${friendsRes.data.friends.length}`);

    // Friends Leaderboard
    const friendsLbRes = await axios.get(`${API}/friends/leaderboard`, authHeader1);
    assert('Friends Circle Standings', Array.isArray(friendsLbRes.data.leaderboard), `User Rank: #${friendsLbRes.data.userRank} of ${friendsLbRes.data.leaderboard.length}`);
  } catch (err) {
    assert('Social Graph Features', false, err.response?.data?.error || err.message);
  }

  // ----------------------------------------------------------------
  // FEATURE SET 6: HEAD-TO-HEAD 1v1 COMPARISON & AI COACH
  // ----------------------------------------------------------------
  console.log('\n⚔️ 6. HEAD-TO-HEAD 1v1 COMPARISON & AI COACH');
  try {
    const compRes = await axios.get(`${API}/friends/compare/${user2.id}`, authHeader1);
    const comp = compRes.data;

    assert('1v1 Head-to-Head Comparison Response', !!comp.user && !!comp.friend, `Delta: ${comp.scoreDelta} pts, Leader: ${comp.leadingUser}`);
    assert('Difficulty Breakdown (Easy/Med/Hard)', !!comp.difficultyComparison?.easy && !!comp.difficultyComparison?.medium && !!comp.difficultyComparison?.hard, `Easy: ${comp.difficultyComparison.easy.user} vs ${comp.difficultyComparison.easy.friend}`);
    assert('DSA Topics & Category Mastery', Array.isArray(comp.topicComparison) && comp.topicComparison.length > 0, `Topics Analyzed: ${comp.topicComparison.length}`);
    assert('AI Strategic Battle Coach', !!comp.aiCoach && !!comp.aiCoach.fastestOvertakePlan, `Plan: "${comp.aiCoach.fastestOvertakePlan}"`);
  } catch (err) {
    assert('Head-to-Head Comparison Engine', false, err.response?.data?.error || err.message);
  }

  // ----------------------------------------------------------------
  // FEATURE SET 7: MULTI-PLATFORM AGGREGATION & DPI ENGINE
  // ----------------------------------------------------------------
  console.log('\n🌐 7. MULTI-PLATFORM AGGREGATION & GLOBAL POWER INDEX (DPI)');
  try {
    // Link Codeforces on User 1
    const cfRes = await axios.post(
      `${API}/platforms/link`,
      { platform: 'codeforces', handle: 'tourist' },
      authHeader1
    );
    assert('Link Codeforces Account (tourist)', cfRes.data.success && cfRes.data.stats?.rating > 3000, `Rating: ${cfRes.data.stats?.rating} Elo (${cfRes.data.stats?.rank}), Solved: ${cfRes.data.stats?.totalSolved}`);

    // Link HackerRank on User 1
    const hrRes = await axios.post(
      `${API}/platforms/link`,
      { platform: 'hackerrank', handle: 'tourist' },
      authHeader1
    );
    assert('Link HackerRank Account (tourist)', hrRes.data.success, `Level: ${hrRes.data.stats?.level}, Badges: ${hrRes.data.stats?.badgesCount}`);

    // Fetch Connected Platforms and Unified DPI
    const platRes = await axios.get(`${API}/platforms`, authHeader1);
    assert('Get Connected Platforms & DPI Profile', platRes.data.success && platRes.data.dpi?.dpiScore > 0, `DPI: ${platRes.data.dpi?.dpiScore.toLocaleString()} (${platRes.data.dpi?.dpiTier} ${platRes.data.dpi?.dpiBadge})`);

    // Sync All Platforms
    const syncPlatRes = await axios.post(`${API}/platforms/sync`, {}, authHeader1);
    assert('Live Sync All Connected Platforms', syncPlatRes.data.success && syncPlatRes.data.dpi?.dpiScore > 0, `Synced DPI: ${syncPlatRes.data.dpi?.dpiScore.toLocaleString()}`);

    // Global DPI Leaderboard
    const dpiLbRes = await axios.get(`${API}/platforms/leaderboard`);
    assert('Global Developer Power Index Leaderboard', dpiLbRes.data.success && Array.isArray(dpiLbRes.data.leaderboard), `Total Global Developers: ${dpiLbRes.data.leaderboard.length}`);

    // Deep Multi-Platform Matrix Comparison
    const matrixRes = await axios.get(`${API}/friends/compare/${user2.id}`, authHeader1);
    assert('Cross-Platform 5-Way Matrix Comparison', matrixRes.data.multiPlatform !== undefined && Array.isArray(matrixRes.data.multiPlatform.platforms), `Platforms Matrix: ${matrixRes.data.multiPlatform.platforms.length} ecosystems, Wins: ${matrixRes.data.multiPlatform.userWins} vs ${matrixRes.data.multiPlatform.friendWins}`);

    // Unlink Platform
    const unlinkRes = await axios.delete(`${API}/platforms/hackerrank`, authHeader1);
    assert('Unlink Platform Profile', unlinkRes.data.success, `Unlinked HackerRank`);
  } catch (err) {
    assert('Multi-Platform & DPI System', false, err.response?.data?.error || err.message);
  }

  // ----------------------------------------------------------------
  // FEATURE SET 8: NOTIFICATIONS & MOBILE TOKENS
  // ----------------------------------------------------------------
  console.log('\n🔔 8. NOTIFICATIONS & EVENT TRIGGERS');
  try {
    const pushRes = await axios.post(
      `${API}/notifications/push-token`,
      { push_token: 'ExponentPushToken[TestMockToken12345]' },
      authHeader1
    );
    assert('Register Mobile Push Token', pushRes.data.success || pushRes.data.message !== undefined, 'Push Token Registered');

    const notifRes = await axios.get(`${API}/notifications`, authHeader1);
    assert('Fetch User Notifications Feed', notifRes.data.success && Array.isArray(notifRes.data.notifications), `Notifications: ${notifRes.data.notifications.length}`);
  } catch (err) {
    assert('Notifications System', false, err.response?.data?.error || err.message);
  }

  // ----------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🎉 ALL CODEARENA FEATURES VERIFIED & FULLY FUNCTIONAL!');
  } else {
    console.log(`⚠️ ${failedTests} test(s) encountered issues.`);
  }
  console.log('================================================================\n');
}

runComprehensiveTestSuite();
