const axios = require('axios');

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';

/**
 * Fetch a user's LeetCode profile stats (problems solved by difficulty)
 */
async function fetchLeetCodeStats(username) {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          ranking
        }
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      LEETCODE_GRAPHQL_URL,
      {
        query,
        variables: { username },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://leetcode.com',
        },
        timeout: 10000,
      }
    );

    const user = response.data?.data?.matchedUser;
    if (!user) {
      throw new Error(`LeetCode user "${username}" not found`);
    }

    const stats = { easy: 0, medium: 0, hard: 0, total: 0 };
    for (const sub of user.submitStats.acSubmissionNum) {
      switch (sub.difficulty) {
        case 'Easy':
          stats.easy = sub.count;
          break;
        case 'Medium':
          stats.medium = sub.count;
          break;
        case 'Hard':
          stats.hard = sub.count;
          break;
        case 'All':
          stats.total = sub.count;
          break;
      }
    }

    return {
      username: user.username,
      realName: user.profile?.realName || '',
      avatar: user.profile?.userAvatar || '',
      ranking: user.profile?.ranking || 0,
      stats,
    };
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('LeetCode rate limit reached. Please try again later.');
    }
    throw error;
  }
}

/**
 * Calculate score based on problem counts
 * Easy: 1 point, Medium: 3 points, Hard: 5 points
 */
function calculateScore(easy, medium, hard) {
  return easy * 1 + medium * 3 + hard * 5;
}

module.exports = { fetchLeetCodeStats, calculateScore };
