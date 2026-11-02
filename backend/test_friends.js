const axios = require('axios');
const API = 'http://localhost:3001/api';

async function runFriendTests() {
  console.log('====================================================');
  console.log('🧪 TESTING CODEARENA FRIENDS & COMPARISON API');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [TEST ${total}] ${title}: PASSED ${extra}`);
    } else {
      console.error(`❌ [TEST ${total}] ${title}: FAILED ${extra}`);
    }
  }

  // 1. Health check
  try {
    const res = await axios.get(API + '/health');
    assert('Server Health', res.data.status === 'live');
  } catch (e) {
    assert('Server Health', false, e.message);
  }

  // 2. Obtain tokens for 2 test users (Register, Login, or synthesize valid test JWT)
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('./src/config');

  let token1 = null;
  let user1 = null;
  let token2 = null;
  let user2 = null;

  try {
    const { supabase } = require('./src/database');
    if (supabase) {
      const { data: users } = await supabase.from('users').select('*').limit(2);
      if (users && users.length >= 2) {
        user1 = users[0];
        user2 = users[1];
        token1 = jwt.sign({ id: user1.id, username: user1.username, email: user1.email }, JWT_SECRET, { expiresIn: '7d' });
        token2 = jwt.sign({ id: user2.id, username: user2.username, email: user2.email }, JWT_SECRET, { expiresIn: '7d' });
        assert('Authenticate Test Users A & B', !!token1 && !!token2, `-> User A: "${user1.username}", User B: "${user2.username}"`);
      }
    }
  } catch (e) {
    console.log('Database user fetch fallback:', e.message);
  }

  if (!token1 || !token2) {
    console.log('Skipping remaining tests because authentication setup failed.');
    return;
  }

  const h1 = { Authorization: 'Bearer ' + token1 };
  const h2 = { Authorization: 'Bearer ' + token2 };

  // 3. Search Users
  try {
    const sRes = await axios.get(`${API}/friends/search?q=${user2.username}`, { headers: h1 });
    assert('Search User B from User A', Array.isArray(sRes.data.users) && sRes.data.users.some(u => u.id === user2.id), `-> Found ${sRes.data.users.length} match(es)`);
  } catch (e) {
    assert('Search User B', false, e?.response?.data?.error || e.message);
  }

  // 4. Send Friend Request (User A -> User B)
  try {
    const reqRes = await axios.post(`${API}/friends/request`, { target_user_id: user2.id }, { headers: h1 });
    assert('Send Friend Request (A -> B)', reqRes.data.status === 'pending_sent' || reqRes.status === 201, `-> ${reqRes.data.message}`);
  } catch (e) {
    assert('Send Friend Request', false, e?.response?.data?.error || e.message);
  }

  // 5. Get Friend Requests on User B (Incoming)
  let friendshipId = null;
  try {
    const reqsRes = await axios.get(`${API}/friends/requests`, { headers: h2 });
    const inc = reqsRes.data.incoming;
    assert('User B Sees Incoming Request', Array.isArray(inc) && inc.length > 0 && inc.some(r => r.user.id === user1.id), `-> Incoming count: ${inc.length}`);
    if (inc.length > 0) friendshipId = inc[0].friendship_id;
  } catch (e) {
    assert('User B Sees Incoming Request', false, e?.response?.data?.error || e.message);
  }

  // 6. Accept Friend Request (User B accepts User A)
  try {
    const accRes = await axios.post(`${API}/friends/accept`, { friendship_id: friendshipId, friend_user_id: user1.id }, { headers: h2 });
    assert('User B Accepts Request', accRes.data.status === 'friends' || accRes.status === 200, `-> ${accRes.data.message}`);
  } catch (e) {
    assert('User B Accepts Request', false, e?.response?.data?.error || e.message);
  }

  // 7. Get Accepted Friends List (User A)
  try {
    const fListRes = await axios.get(`${API}/friends`, { headers: h1 });
    assert('User A Friends List', Array.isArray(fListRes.data.friends) && fListRes.data.friends.some(f => f.id === user2.id), `-> Friends count: ${fListRes.data.friends.length}`);
  } catch (e) {
    assert('User A Friends List', false, e?.response?.data?.error || e.message);
  }

  // 8. Friends Leaderboard (User A)
  try {
    const lbRes = await axios.get(`${API}/friends/leaderboard`, { headers: h1 });
    assert('Friends Leaderboard', Array.isArray(lbRes.data.leaderboard) && lbRes.data.leaderboard.length >= 2, `-> Leaderboard rank: #${lbRes.data.userRank} | Total: ${lbRes.data.leaderboard.length}`);
  } catch (e) {
    assert('Friends Leaderboard', false, e?.response?.data?.error || e.message);
  }

  // 9. Head-to-Head Comparison (User A compares with User B)
  try {
    const compRes = await axios.get(`${API}/friends/compare/${user2.id}`, { headers: h1 });
    const c = compRes.data;
    assert('Head-to-Head Comparison', !!c.user && !!c.friend && !!c.difficultyComparison && !!c.topicComparison && !!c.aiCoach, `-> Leader: ${c.leadingUser} (Score Delta: ${c.scoreDelta}) | Topics compared: ${c.topicComparison?.length} | AI Action: "${c.aiCoach?.summary}"`);
  } catch (e) {
    assert('Head-to-Head Comparison', false, e?.response?.data?.error || e.message);
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');
}

runFriendTests().catch(console.error);
