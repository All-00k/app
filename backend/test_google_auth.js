const axios = require('axios');
const express = require('express');
const authRoutes = require('./src/routes/authRoutes');
const { getDb } = require('./src/database');

async function runGoogleAuthTests() {
  console.log('🚀 Running CodeArena Google Auth Integration Tests...\n');

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  const server = app.listen(3098);
  const baseUrl = 'http://localhost:3098/api/auth';

  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Supabase DB not configured');
    }

    // 1. Test existing user login via Google
    console.log('👉 [Test 1] Google Sign-In for Existing User:');
    const existingRes = await axios.post(`${baseUrl}/google`, {
      email: 'ay879018@gmail.com',
      name: 'Existing AY',
    });
    console.log('   Status:', existingRes.status);
    console.log('   User Username:', existingRes.data.user?.username);
    console.log('   User Email:', existingRes.data.user?.email);
    console.log('   Token Issued:', !!existingRes.data.token);
    if (!existingRes.data.token || existingRes.data.user?.email !== 'ay879018@gmail.com') {
      throw new Error('Test 1 failed: Token not returned for existing user');
    }
    console.log('   ✅ Test 1 Passed: Existing user logged in successfully via Google.\n');

    // 2. Test new user Google sign-in without LeetCode handle (First-time flow prompt)
    console.log('👉 [Test 2] First-Time Google User without LeetCode ID:');
    const testNewEmail = `test_google_${Date.now()}@gmail.com`;
    const newRes = await axios.post(`${baseUrl}/google`, {
      email: testNewEmail,
      name: 'Google Newbie',
      avatar: 'https://lh3.googleusercontent.com/test-avatar',
    });
    console.log('   Status:', newRes.status);
    console.log('   needsLeetCode:', newRes.data.needsLeetCode);
    console.log('   Email:', newRes.data.email);
    if (!newRes.data.needsLeetCode) {
      throw new Error('Test 2 failed: Expected needsLeetCode to be true');
    }
    console.log('   ✅ Test 2 Passed: Correctly requested LeetCode handle for new Google user.\n');

    // 3. Test validation for invalid LeetCode ID on registration
    console.log('👉 [Test 3] Reject Invalid LeetCode Username on Google Registration:');
    try {
      await axios.post(`${baseUrl}/google`, {
        email: testNewEmail,
        name: 'Google Newbie',
        leetcode_id: 'non_existent_fake_leetcode_user_9999999999',
      });
      throw new Error('Test 3 failed: Should have thrown an error for invalid LeetCode ID');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('   Response 400 Error as expected:', err.response.data.error);
        console.log('   ✅ Test 3 Passed: Rejected invalid LeetCode username.\n');
      } else {
        throw err;
      }
    }

    // 4. Test validation for duplicate LeetCode ID
    console.log('👉 [Test 4] Reject Duplicate LeetCode Username:');
    try {
      // Find an already taken LeetCode username in DB
      const { data: u } = await db.from('users').select('leetcode_id').limit(1).single();
      if (u && u.leetcode_id) {
        await axios.post(`${baseUrl}/google`, {
          email: testNewEmail,
          name: 'Google Newbie',
          leetcode_id: u.leetcode_id,
        });
        throw new Error('Test 4 failed: Should have rejected duplicate LeetCode ID');
      }
    } catch (err) {
      if (err.response && err.response.status === 409) {
        console.log('   Response 409 Error as expected:', err.response.data.error);
        console.log('   ✅ Test 4 Passed: Duplicate LeetCode handle correctly prevented.\n');
      } else {
        throw err;
      }
    }

    console.log('🎉 ALL GOOGLE AUTH TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
  }
}

runGoogleAuthTests().catch((err) => {
  console.error('❌ Test suite failed:', err.message);
  process.exit(1);
});
