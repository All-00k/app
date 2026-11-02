const axios = require('axios');

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';

const DSA_CATEGORIES = [
  { id: 'arrays_strings', name: 'Arrays & Strings', icon: 'layers-outline', tags: ['array', 'string', 'matrix', 'simulation'] },
  { id: 'dp', name: 'Dynamic Programming', icon: 'flash-outline', tags: ['dynamic-programming', 'memoization', 'game-theory'] },
  { id: 'trees', name: 'Trees & BST', icon: 'git-branch-outline', tags: ['tree', 'binary-tree', 'binary-search-tree', 'trie', 'segment-tree'] },
  { id: 'graphs', name: 'Graphs & BFS/DFS', icon: 'share-social-outline', tags: ['graph', 'depth-first-search', 'breadth-first-search', 'union-find', 'topological-sort', 'shortest-path'] },
  { id: 'hash_tables', name: 'Hash Tables & Sets', icon: 'grid-outline', tags: ['hash-table', 'ordered-set', 'counting'] },
  { id: 'binary_search', name: 'Binary Search', icon: 'search-outline', tags: ['binary-search', 'divide-and-conquer', 'quickselect'] },
  { id: 'two_pointers', name: 'Two Pointers & Sliding Window', icon: 'swap-horizontal-outline', tags: ['two-pointers', 'sliding-window'] },
  { id: 'greedy_backtrack', name: 'Greedy & Backtracking', icon: 'navigate-outline', tags: ['greedy', 'backtracking', 'recursion'] },
  { id: 'math_bits', name: 'Math & Bit Manipulation', icon: 'calculator-outline', tags: ['math', 'bit-manipulation', 'bitmask', 'geometry', 'combinatorics'] },
  { id: 'stack_queue', name: 'Stack, Queue & Heap', icon: 'cube-outline', tags: ['stack', 'queue', 'heap-priority-queue', 'monotonic-stack', 'monotonic-queue', 'design'] },
];

/**
 * Calculate estimated topic distribution if tagProblemCounts is not available
 */
function estimateTopicBreakdown(easy, medium, hard) {
  const total = easy + medium + hard;
  if (total === 0) {
    return DSA_CATEGORIES.map((cat) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      solved: 0,
    }));
  }

  // Realistic DSA distribution weights
  const weights = {
    arrays_strings: 0.28,
    hash_tables: 0.16,
    dp: 0.14,
    trees: 0.12,
    graphs: 0.10,
    two_pointers: 0.08,
    binary_search: 0.07,
    math_bits: 0.06,
    stack_queue: 0.05,
    greedy_backtrack: 0.04,
  };

  return DSA_CATEGORIES.map((cat) => {
    const w = weights[cat.id] || 0.05;
    const solved = Math.max(1, Math.round(total * w));
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      solved: Math.min(total, solved),
    };
  });
}

/**
 * Map raw LeetCode tagProblemCounts into structured DSA categories
 */
function mapTagProblemCountsToCategories(tagProblemCounts, totalSolved, easy, medium, hard) {
  if (!tagProblemCounts) {
    return estimateTopicBreakdown(easy, medium, hard);
  }

  const allTags = [
    ...(tagProblemCounts.advanced || []),
    ...(tagProblemCounts.intermediate || []),
    ...(tagProblemCounts.fundamental || []),
  ];

  if (allTags.length === 0) {
    return estimateTopicBreakdown(easy, medium, hard);
  }

  const tagMap = new Map();
  for (const item of allTags) {
    const slug = (item.tagSlug || '').toLowerCase();
    const count = Number(item.problemsSolved) || 0;
    tagMap.set(slug, Math.max(tagMap.get(slug) || 0, count));
  }

  return DSA_CATEGORIES.map((cat) => {
    let catSolved = 0;
    for (const tag of cat.tags) {
      if (tagMap.has(tag)) {
        catSolved += tagMap.get(tag);
      }
    }
    // Handle cases where category has no raw data
    if (catSolved === 0 && totalSolved > 0) {
      const fallback = estimateTopicBreakdown(easy, medium, hard).find((c) => c.id === cat.id);
      catSolved = fallback ? fallback.solved : 0;
    }
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      solved: catSolved,
    };
  });
}

/**
 * Fetch a user's LeetCode profile stats (basic problem breakdown)
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
    for (const sub of user.submitStats?.acSubmissionNum || []) {
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
 * Fetch comprehensive LeetCode Profile (including contest ranking & detailed topic tags)
 */
async function fetchFullLeetCodeProfile(username) {
  const query = `
    query getFullLeetCodeProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          ranking
          reputation
        }
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
        tagProblemCounts {
          advanced {
            tagName
            tagSlug
            problemsSolved
          }
          intermediate {
            tagName
            tagSlug
            problemsSolved
          }
          fundamental {
            tagName
            tagSlug
            problemsSolved
          }
        }
      }
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
        badge {
          name
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
        timeout: 12000,
      }
    );

    const data = response.data?.data;
    const user = data?.matchedUser;
    if (!user) {
      throw new Error(`LeetCode user "${username}" not found`);
    }

    const stats = { easy: 0, medium: 0, hard: 0, total: 0 };
    for (const sub of user.submitStats?.acSubmissionNum || []) {
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

    const contest = data?.userContestRanking;
    const contestStats = {
      rating: contest?.rating ? Math.round(contest.rating) : 1500,
      globalRanking: contest?.globalRanking || 0,
      attendedContestsCount: contest?.attendedContestsCount || 0,
      topPercentage: contest?.topPercentage || 0,
      badge: contest?.badge?.name || (contest?.rating >= 2100 ? 'Guardian' : contest?.rating >= 1800 ? 'Knight' : ''),
    };

    const categories = mapTagProblemCountsToCategories(
      user.tagProblemCounts,
      stats.total,
      stats.easy,
      stats.medium,
      stats.hard
    );

    return {
      username: user.username,
      realName: user.profile?.realName || '',
      avatar: user.profile?.userAvatar || '',
      ranking: user.profile?.ranking || 0,
      reputation: user.profile?.reputation || 0,
      stats,
      contest: contestStats,
      categories,
    };
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn('LeetCode Rate Limit, returning fallback full profile');
    }
    // If full query fails, try basic fallback
    try {
      const basic = await fetchLeetCodeStats(username);
      return {
        ...basic,
        contest: {
          rating: 1500 + Math.min(600, (basic.stats.medium * 3 + basic.stats.hard * 5)),
          globalRanking: basic.ranking,
          attendedContestsCount: 0,
          badge: '',
        },
        categories: estimateTopicBreakdown(basic.stats.easy, basic.stats.medium, basic.stats.hard),
      };
    } catch (e2) {
      throw error;
    }
  }
}

/**
 * Calculate score based on problem counts
 * Easy: 1 point, Medium: 3 points, Hard: 5 points
 */
function calculateScore(easy, medium, hard) {
  return (easy || 0) * 1 + (medium || 0) * 3 + (hard || 0) * 5;
}

module.exports = {
  fetchLeetCodeStats,
  fetchFullLeetCodeProfile,
  calculateScore,
  estimateTopicBreakdown,
  DSA_CATEGORIES,
};
