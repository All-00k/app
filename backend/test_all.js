const axios = require('axios');
const API = 'http://localhost:3001/api';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 CODEARENA FULL SUPABASE INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(title, condition, extra = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [TEST ${totalTests}] ${title}: PASSED ${extra}`);
    } else {
      console.error(`❌ [TEST ${totalTests}] ${title}: FAILED ${extra}`);
    }
  }

  // 1. Health & Supabase check
  try {
    const res = await axios.get(API + '/health');
    assert('Health & Supabase Connection', res.data.status === 'live' && res.data.database === 'connected', `-> DB: ${res.data.database}`);
  } catch (e) {
    assert('Health Check', false, e.message);
  }

  // 2. User Registration (using real LeetCode username)
  const rand = Math.floor(1000 + Math.random() * 9000);
  const testUser1 = {
    username: `coder_${rand}`,
    email: `coder_${rand}@codearena.app`,
    password: 'password123',
    leetcode_id: 'lee215',
  };

  let auth1 = null;
  try {
    const regRes = await axios.post(API + '/auth/register', testUser1);
    auth1 = regRes.data;
    assert('User Registration', !!auth1.token && auth1.user.username === testUser1.username, `-> Created user #${auth1.user.id} (${auth1.user.username}) | Score: ${auth1.user.total_score} | Tier: ${auth1.user.tier}`);
  } catch (e) {
    assert('User Registration', false, e?.response?.data?.error || e.message);
  }

  // 3. Duplicate Email Prevention
  try {
    await axios.post(API + '/auth/register', {
      username: `unique_user_${rand}`,
      email: testUser1.email, // duplicate email
      password: 'password123',
      leetcode_id: 'neal_wu',
    });
    assert('Duplicate Email Block', false, 'Should have failed with 409');
  } catch (e) {
    assert('Duplicate Email Block', e?.response?.status === 409, `-> Properly blocked with 409: "${e?.response?.data?.error}"`);
  }

  // 4. Duplicate Username Prevention
  try {
    await axios.post(API + '/auth/register', {
      username: testUser1.username, // duplicate username
      email: `another_email_${rand}@codearena.app`,
      password: 'password123',
      leetcode_id: 'neal_wu',
    });
    assert('Duplicate Username Block', false, 'Should have failed with 409');
  } catch (e) {
    assert('Duplicate Username Block', e?.response?.status === 409, `-> Properly blocked with 409: "${e?.response?.data?.error}"`);
  }

  // 5. Login via Email
  try {
    const loginRes = await axios.post(API + '/auth/login', {
      email: testUser1.email,
      password: testUser1.password,
    });
    assert('Login via Email', !!loginRes.data.token && loginRes.data.user.email === testUser1.email, `-> User: ${loginRes.data.user.username} | Tier: ${loginRes.data.user.tier}`);
  } catch (e) {
    assert('Login via Email', false, e?.response?.data?.error || e.message);
  }

  // 6. Login via Username
  try {
    const loginUserRes = await axios.post(API + '/auth/login', {
      email: testUser1.username, // using username in login field
      password: testUser1.password,
    });
    assert('Login via Username', !!loginUserRes.data.token && loginUserRes.data.user.username === testUser1.username, `-> Token received for ${loginUserRes.data.user.username}`);
  } catch (e) {
    assert('Login via Username', false, e?.response?.data?.error || e.message);
  }

  if (!auth1?.token) {
    console.log('\nCannot continue subsequent tests without auth token.');
    return;
  }

  const headers1 = { Authorization: 'Bearer ' + auth1.token };

  // 7. Profile Fetch
  try {
    const profRes = await axios.get(API + '/auth/profile', { headers: headers1 });
    assert('Profile Fetch', profRes.data.user.id === auth1.user.id, `-> Profile loaded for ${profRes.data.user.username} (Tier: ${profRes.data.user.tier})`);
  } catch (e) {
    assert('Profile Fetch', false, e?.response?.data?.error || e.message);
  }

  // 8. Event Creation
  let createdEvent = null;
  try {
    const evRes = await axios.post(API + '/events', {
      name: '⚔️ Algo Champions League',
      duration_days: 7,
      mode: 'standard',
      description: 'Automated Test Tournament',
    }, { headers: headers1 });
    createdEvent = evRes.data.event;
    assert('Event Creation', !!createdEvent.invite_code, `-> Event #${createdEvent.id} Code: ${createdEvent.invite_code}`);
  } catch (e) {
    assert('Event Creation', false, e?.response?.data?.error || e.message);
  }

  // 9. Fetch User Events
  try {
    const listRes = await axios.get(API + '/events', { headers: headers1 });
    assert('Get User Events', Array.isArray(listRes.data.events) && listRes.data.events.length > 0, `-> Found ${listRes.data.events.length} event(s)`);
  } catch (e) {
    assert('Get User Events', false, e?.response?.data?.error || e.message);
  }

  // 10. Fetch Event Leaderboard
  if (createdEvent) {
    try {
      const lbRes = await axios.get(`${API}/events/${createdEvent.id}/leaderboard`, { headers: headers1 });
      assert('Event Leaderboard', Array.isArray(lbRes.data.leaderboard), `-> Entries: ${lbRes.data.leaderboard.length}`);
    } catch (e) {
      assert('Event Leaderboard', false, e?.response?.data?.error || e.message);
    }
  }

  // 11. Global Rankings
  try {
    const rankRes = await axios.get(API + '/rankings', { headers: headers1 });
    assert('Global Rankings', Array.isArray(rankRes.data.rankings) && rankRes.data.rankings.length > 0, `-> Total Ranked: ${rankRes.data.rankings.length}`);
  } catch (e) {
    assert('Global Rankings', false, e?.response?.data?.error || e.message);
  }

  // 12. Notifications Feed
  try {
    const notifRes = await axios.get(API + '/notifications', { headers: headers1 });
    assert('Notifications Feed', Array.isArray(notifRes.data.notifications), `-> Live alerts: ${notifRes.data.notifications.length}`);
  } catch (e) {
    assert('Notifications Feed', false, e?.response?.data?.error || e.message);
  }

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================\n');
}

runTestSuite().catch(console.error);
