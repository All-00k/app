const { supabase } = require('../database');
const { fetchFullLeetCodeProfile, fetchLeetCodeStats, calculateScore } = require('../leetcode');
const { getTierInfo } = require('../utils/tier');
const { calculateDPI, getDPITier } = require('../platforms');

// In-memory fallback cache for friendships if Supabase table is pending cloud migration
const memoryFriendships = new Map();

function getMemoryKey(u1, u2) {
  const min = Math.min(Number(u1), Number(u2));
  const max = Math.max(Number(u1), Number(u2));
  return `${min}_${max}`;
}

/**
 * Generate dynamic AI Strategy Coach recommendations
 */
function generateAICoachStrategy(userProfile, friendProfile, userCategories, friendCategories) {
  const userScore = userProfile.total_score || 0;
  const friendScore = friendProfile.total_score || 0;
  const scoreGap = friendScore - userScore;

  // Find biggest topic gaps where friend is ahead
  const topicGaps = [];
  const userDominantTopics = [];

  for (const uCat of userCategories) {
    const fCat = friendCategories.find((c) => c.id === uCat.id) || { solved: 0 };
    const diff = (fCat.solved || 0) - (uCat.solved || 0);
    if (diff > 0) {
      topicGaps.push({ name: uCat.name, gap: diff });
    } else if (diff < 0) {
      userDominantTopics.push({ name: uCat.name, lead: Math.abs(diff) });
    }
  }

  topicGaps.sort((a, b) => b.gap - a.gap);
  userDominantTopics.sort((a, b) => b.lead - a.lead);

  const topGapTopic = topicGaps[0]?.name || 'Dynamic Programming';
  const secondGapTopic = topicGaps[1]?.name || 'Graphs & BFS/DFS';
  const topStrengthTopic = userDominantTopics[0]?.name || 'Arrays & Strings';

  if (scoreGap > 0) {
    // User is behind - generate catch-up sprint roadmap
    const neededMediums = Math.ceil(scoreGap / 3);
    const neededHards = Math.ceil(scoreGap / 5);
    const hybridMediums = Math.ceil((scoreGap * 0.6) / 3);
    const hybridHards = Math.ceil((scoreGap * 0.4) / 5);

    const actionSteps = [
      `🎯 Focus on ${topGapTopic}: Solve ${Math.min(6, topicGaps[0]?.gap || 4)} Medium problems (+${Math.min(6, topicGaps[0]?.gap || 4) * 3} pts).`,
      `⚡ Attack High-Yield Hards: Complete ${Math.max(1, hybridHards)} Hard problems in ${secondGapTopic} (+${Math.max(1, hybridHards) * 5} pts).`,
      `🛡️ Maintain your advantage in ${topStrengthTopic} where you lead by ${userDominantTopics[0]?.lead || 5} solves.`,
      `⚔️ Daily Target: Solve 2 Mediums + 1 Hard daily to bridge the ${scoreGap} pts gap in ~${Math.max(1, Math.ceil(scoreGap / 11))} days.`,
    ];

    return {
      status: 'behind',
      leadScore: scoreGap,
      summary: `You are ${scoreGap} points behind @${friendProfile.username}. A targeted sprint in ${topGapTopic} and ${secondGapTopic} will quickly close the gap!`,
      recommendedFocus: [topGapTopic, secondGapTopic],
      actionSteps,
      fastestOvertakePlan: `${hybridMediums} Mediums + ${hybridHards} Hards = +${hybridMediums * 3 + hybridHards * 5} pts`,
      userStrengths: userDominantTopics.map((t) => t.name).slice(0, 3),
      friendStrengths: topicGaps.map((t) => t.name).slice(0, 3),
    };
  } else if (scoreGap < 0) {
    // User is ahead
    const lead = Math.abs(scoreGap);
    const actionSteps = [
      `👑 Maintain your dominant ${lead} pts lead over @${friendProfile.username}.`,
      `📈 Defend ${topGapTopic}: @${friendProfile.username} is strongest here, solve 2 Mediums to fortify.`,
      `🚀 Exploit your lead in ${topStrengthTopic} (+${userDominantTopics[0]?.lead || 8} problems lead).`,
      `⚔️ Challenge @${friendProfile.username} to a 1v1 Arena Duel to test your algorithmic speed!`,
    ];

    return {
      status: 'ahead',
      leadScore: lead,
      summary: `You are leading by ${lead} points against @${friendProfile.username}! Keep solving consistently to maintain your leaderboard dominance.`,
      recommendedFocus: [topStrengthTopic, topGapTopic],
      actionSteps,
      fastestOvertakePlan: `Solve 1 Hard problem daily (+5 pts) to expand lead to ${lead + 15} pts.`,
      userStrengths: userDominantTopics.map((t) => t.name).slice(0, 3),
      friendStrengths: topicGaps.map((t) => t.name).slice(0, 3),
    };
  } else {
    return {
      status: 'tied',
      leadScore: 0,
      summary: `You and @${friendProfile.username} are in an exact tie with ${userScore} points! The next solved problem takes the crown.`,
      recommendedFocus: [topGapTopic, 'Dynamic Programming'],
      actionSteps: [
        `⚡ Solve 1 Medium problem right now (+3 pts) to take immediate 1st place!`,
        `🎯 Focus on ${topGapTopic} for maximum skill leverage.`,
      ],
      fastestOvertakePlan: `1 Medium solve (+3 pts) breaks the tie!`,
      userStrengths: userDominantTopics.map((t) => t.name).slice(0, 3),
      friendStrengths: topicGaps.map((t) => t.name).slice(0, 3),
    };
  }
}

/**
 * Format user database row into rich API representation
 */
function formatUser(u) {
  if (!u) return null;
  const score = u.total_score || 0;
  const tierInfo = getTierInfo(score);
  return {
    id: u.id,
    username: u.username,
    email: u.email || '',
    leetcode_id: u.leetcode_id,
    avatar_url: u.avatar_url || '',
    total_easy: u.total_easy || 0,
    total_medium: u.total_medium || 0,
    total_hard: u.total_hard || 0,
    total_score: score,
    xp: u.xp || score * 10,
    tier: tierInfo.tier,
    tier_badge: tierInfo.badge,
    tier_color: tierInfo.color,
    color: tierInfo.color,
    next_score: tierInfo.nextScore,
    min_score: tierInfo.minScore,
    last_synced_at: u.last_synced_at,
    created_at: u.created_at,
  };
}

/**
 * 1. GET /api/friends - Get all accepted friends of current user
 */
exports.getFriends = async (req, res) => {
  try {
    const currentUserId = req.userId;
    let friendUserIds = [];

    if (supabase) {
      try {
        const { data: friendships, error } = await supabase
          .from('friendships')
          .select('id, user_id, friend_id, status, created_at')
          .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
          .eq('status', 'accepted');

        if (!error && friendships) {
          friendUserIds = friendships.map((f) =>
            f.user_id === currentUserId ? f.friend_id : f.user_id
          );
        }
      } catch (dbErr) {
        console.warn('Friendships query fallback to memory:', dbErr.message);
      }
    }

    // Check memory fallback
    for (const [key, val] of memoryFriendships.entries()) {
      if (val.status === 'accepted') {
        if (val.user_id === currentUserId) friendUserIds.push(val.friend_id);
        else if (val.friend_id === currentUserId) friendUserIds.push(val.user_id);
      }
    }

    friendUserIds = Array.from(new Set(friendUserIds));

    if (friendUserIds.length === 0) {
      return res.json({ friends: [] });
    }

    let friendsData = [];
    if (supabase) {
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('*')
        .in('id', friendUserIds);

      if (!uErr && users) {
        friendsData = users.map(formatUser);
      }
    }

    return res.json({ friends: friendsData });
  } catch (e) {
    console.error('Get Friends Error:', e);
    return res.status(500).json({ error: 'Failed to fetch friends list: ' + e.message });
  }
};

/**
 * 2. GET /api/friends/leaderboard - Leaderboard of friends + current user
 */
exports.getFriendsLeaderboard = async (req, res) => {
  try {
    const currentUserId = req.userId;
    let friendUserIds = [currentUserId];

    if (supabase) {
      try {
        const { data: friendships, error } = await supabase
          .from('friendships')
          .select('id, user_id, friend_id, status')
          .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
          .eq('status', 'accepted');

        if (!error && friendships) {
          friendships.forEach((f) => {
            friendUserIds.push(f.user_id === currentUserId ? f.friend_id : f.user_id);
          });
        }
      } catch (dbErr) {
        console.warn('Friendships query fallback to memory:', dbErr.message);
      }
    }

    // Check memory fallback
    for (const [key, val] of memoryFriendships.entries()) {
      if (val.status === 'accepted') {
        if (val.user_id === currentUserId) friendUserIds.push(val.friend_id);
        else if (val.friend_id === currentUserId) friendUserIds.push(val.user_id);
      }
    }

    friendUserIds = Array.from(new Set(friendUserIds));

    let users = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', friendUserIds)
        .order('total_score', { ascending: false });

      if (!error && data) {
        users = data;
      }
    }

    const leaderboard = users.map((u, index) => {
      const formatted = formatUser(u);
      return {
        ...formatted,
        rank: index + 1,
        isCurrentUser: u.id === currentUserId,
      };
    });

    const userRank = leaderboard.findIndex((e) => e.id === currentUserId) + 1;

    return res.json({
      leaderboard,
      userRank: userRank > 0 ? userRank : 1,
      totalFriends: Math.max(0, leaderboard.length - 1),
    });
  } catch (e) {
    console.error('Friends Leaderboard Error:', e);
    return res.status(500).json({ error: 'Failed to fetch friends leaderboard' });
  }
};

/**
 * 3. GET /api/friends/requests - Pending incoming & outgoing friend requests
 */
exports.getFriendRequests = async (req, res) => {
  try {
    const currentUserId = req.userId;
    let incomingRows = [];
    let outgoingRows = [];

    if (supabase) {
      try {
        const { data: incoming, error: inErr } = await supabase
          .from('friendships')
          .select('id, user_id, friend_id, status, created_at, sender:users!user_id(*)')
          .eq('friend_id', currentUserId)
          .eq('status', 'pending');

        if (!inErr && incoming) incomingRows = incoming;

        const { data: outgoing, error: outErr } = await supabase
          .from('friendships')
          .select('id, user_id, friend_id, status, created_at, receiver:users!friend_id(*)')
          .eq('user_id', currentUserId)
          .eq('status', 'pending');

        if (!outErr && outgoing) outgoingRows = outgoing;
      } catch (e) {
        console.warn('Friendships query fallback to memory:', e.message);
      }
    }

    // Memory fallback if needed
    for (const [key, val] of memoryFriendships.entries()) {
      if (val.status === 'pending') {
        if (val.friend_id === currentUserId && !incomingRows.some((r) => r.id === val.id)) {
          incomingRows.push(val);
        } else if (val.user_id === currentUserId && !outgoingRows.some((r) => r.id === val.id)) {
          outgoingRows.push(val);
        }
      }
    }

    // Collect missing user IDs to fetch
    const missingUserIds = new Set();
    incomingRows.forEach((r) => {
      if (!r.sender && !r.user) missingUserIds.add(r.user_id);
    });
    outgoingRows.forEach((r) => {
      if (!r.receiver && !r.user) missingUserIds.add(r.friend_id);
    });

    const userMap = new Map();
    if (missingUserIds.size > 0 && supabase) {
      const { data: fetchedUsers } = await supabase
        .from('users')
        .select('*')
        .in('id', Array.from(missingUserIds));

      if (fetchedUsers) {
        fetchedUsers.forEach((u) => userMap.set(u.id, u));
      }
    }

    const formattedIncoming = incomingRows.map((r) => {
      const userObj = r.sender || r.user || userMap.get(r.user_id);
      return {
        friendship_id: r.id,
        user: formatUser(userObj),
        created_at: r.created_at,
      };
    }).filter((r) => !!r.user);

    const formattedOutgoing = outgoingRows.map((r) => {
      const userObj = r.receiver || r.friend || userMap.get(r.friend_id);
      return {
        friendship_id: r.id,
        user: formatUser(userObj),
        created_at: r.created_at,
      };
    }).filter((r) => !!r.user);

    return res.json({
      incoming: formattedIncoming,
      outgoing: formattedOutgoing,
    });
  } catch (e) {
    console.error('Get Friend Requests Error:', e);
    return res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
};

/**
 * 4. GET /api/friends/search?q=... - Search users and return friendship status
 */
exports.searchUsers = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const query = (req.query.q || '').trim();

    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Query users matching username, leetcode_id, or email
    const { data: foundUsers, error } = await supabase
      .from('users')
      .select('*')
      .neq('id', currentUserId)
      .or(`username.ilike.%${query}%,leetcode_id.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20);

    if (error) {
      return res.status(500).json({ error: 'User search error: ' + error.message });
    }

    // Check friendship status for each found user
    let existingFriendships = [];
    try {
      const { data: fships, error: fErr } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (!fErr && fships) {
        existingFriendships = fships;
      }
    } catch (e) {}

    const results = (foundUsers || []).map((u) => {
      const formatted = formatUser(u);
      let friendship_status = 'none';
      let friendship_id = null;

      // Check DB friendships
      const match = existingFriendships.find(
        (f) =>
          (f.user_id === currentUserId && f.friend_id === u.id) ||
          (f.friend_id === currentUserId && f.user_id === u.id)
      );

      if (match) {
        friendship_id = match.id;
        if (match.status === 'accepted') {
          friendship_status = 'friends';
        } else if (match.status === 'pending') {
          friendship_status = match.user_id === currentUserId ? 'pending_sent' : 'pending_received';
        }
      }

      // Check memory friendships
      const memKey = getMemoryKey(currentUserId, u.id);
      if (memoryFriendships.has(memKey)) {
        const mem = memoryFriendships.get(memKey);
        friendship_id = mem.id;
        if (mem.status === 'accepted') friendship_status = 'friends';
        else if (mem.status === 'pending') {
          friendship_status = mem.user_id === currentUserId ? 'pending_sent' : 'pending_received';
        }
      }

      return {
        ...formatted,
        friendship_status,
        friendship_id,
      };
    });

    return res.json({ users: results });
  } catch (e) {
    console.error('Search Users Error:', e);
    return res.status(500).json({ error: 'User search failed' });
  }
};

/**
 * 5. POST /api/friends/request - Send friend request
 */
exports.sendRequest = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { target_user_id, identifier } = req.body;

    let targetUserId = target_user_id ? Number(target_user_id) : null;

    if (!targetUserId && identifier) {
      const cleanIdent = identifier.trim();
      const { data: targetUser, error: findErr } = await supabase
        .from('users')
        .select('id, username')
        .or(`username.ilike.${cleanIdent},leetcode_id.ilike.${cleanIdent},email.ilike.${cleanIdent}`)
        .maybeSingle();

      if (findErr || !targetUser) {
        return res.status(404).json({ error: `User "${identifier}" not found` });
      }
      targetUserId = targetUser.id;
    }

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID or handle is required' });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot add yourself as a friend' });
    }

    // Check if reverse request is pending -> auto accept!
    let existing = null;
    if (supabase) {
      try {
        const { data: ex, error } = await supabase
          .from('friendships')
          .select('*')
          .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`)
          .maybeSingle();

        if (!error) existing = ex;
      } catch (e) {}
    }

    const memKey = getMemoryKey(currentUserId, targetUserId);
    if (!existing && memoryFriendships.has(memKey)) {
      existing = memoryFriendships.get(memKey);
    }

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(200).json({ message: 'You are already connected as friends!', status: 'friends' });
      }
      if (existing.status === 'pending') {
        if (existing.user_id === currentUserId) {
          return res.status(200).json({ message: 'Friend request already sent', status: 'pending_sent' });
        } else {
          // Auto-accept reverse request!
          if (supabase) {
            try {
              await supabase
                .from('friendships')
                .update({ status: 'accepted', updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            } catch (e) {}
          }
          memoryFriendships.set(memKey, { ...existing, status: 'accepted' });
          return res.status(200).json({ success: true, message: 'Friend request accepted!', status: 'friends' });
        }
      }
    }

    // Insert new pending friend request
    let inserted = null;
    if (supabase) {
      try {
        const { data, error: insertErr } = await supabase
          .from('friendships')
          .insert({
            user_id: currentUserId,
            friend_id: targetUserId,
            status: 'pending',
          })
          .select()
          .single();

        if (!insertErr) inserted = data;
      } catch (e) {
        console.warn('Friendship insert fallback:', e.message);
      }
    }

    if (!inserted) {
      inserted = {
        id: Date.now(),
        user_id: currentUserId,
        friend_id: targetUserId,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }

    memoryFriendships.set(memKey, inserted);

    // Send notification
    if (supabase) {
      try {
        const { data: sender } = await supabase.from('users').select('username').eq('id', currentUserId).maybeSingle();
        const senderName = sender?.username || 'A coder';
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          title: 'Friend Request',
          message: `${senderName} sent you a friend request.`,
          type: 'friend_request',
        });
      } catch (nErr) {}
    }

    return res.status(201).json({
      success: true,
      message: 'Friend request sent successfully',
      friendship: inserted,
      status: 'pending_sent',
    });
  } catch (e) {
    console.error('Send Friend Request Error:', e);
    return res.status(500).json({ error: 'Failed to send friend request: ' + e.message });
  }
};

/**
 * 6. POST /api/friends/accept - Accept incoming friend request
 */
exports.acceptRequest = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { friendship_id, friend_user_id } = req.body;

    let targetId = friendship_id;
    let friendId = friend_user_id ? Number(friend_user_id) : null;

    if (supabase) {
      try {
        let query = supabase.from('friendships').update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        });

        if (targetId) {
          query = query.eq('id', targetId).eq('friend_id', currentUserId);
        } else if (friendId) {
          query = query.eq('user_id', friendId).eq('friend_id', currentUserId);
        }

        await query;
      } catch (e) {}
    }

    if (friendId) {
      const memKey = getMemoryKey(currentUserId, friendId);
      if (memoryFriendships.has(memKey)) {
        memoryFriendships.get(memKey).status = 'accepted';
      }
    }

    return res.json({ success: true, message: 'Friend request accepted!', status: 'friends' });
  } catch (e) {
    console.error('Accept Friend Request Error:', e);
    return res.status(500).json({ error: 'Failed to accept friend request' });
  }
};

/**
 * 7. POST /api/friends/reject - Reject incoming friend request
 */
exports.rejectRequest = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { friendship_id, friend_user_id } = req.body;

    let targetId = friendship_id;
    let friendId = friend_user_id ? Number(friend_user_id) : null;

    if (supabase) {
      try {
        let query = supabase.from('friendships').delete();
        if (targetId) {
          query = query.eq('id', targetId).or(`friend_id.eq.${currentUserId},user_id.eq.${currentUserId}`);
        } else if (friendId) {
          query = query.or(`and(user_id.eq.${currentUserId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUserId})`);
        }
        await query;
      } catch (e) {}
    }

    if (friendId) {
      const memKey = getMemoryKey(currentUserId, friendId);
      memoryFriendships.delete(memKey);
    }

    return res.json({ message: 'Friend request removed', status: 'none' });
  } catch (e) {
    console.error('Reject Friend Request Error:', e);
    return res.status(500).json({ error: 'Failed to decline friend request' });
  }
};

/**
 * 8. DELETE /api/friends/:friendId - Remove friend
 */
exports.removeFriend = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const friendId = Number(req.params.friendId);

    if (supabase) {
      try {
        await supabase
          .from('friendships')
          .delete()
          .or(`and(user_id.eq.${currentUserId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUserId})`);
      } catch (e) {}
    }

    const memKey = getMemoryKey(currentUserId, friendId);
    memoryFriendships.delete(memKey);

    return res.json({ message: 'Friend removed successfully' });
  } catch (e) {
    console.error('Remove Friend Error:', e);
    return res.status(500).json({ error: 'Failed to remove friend' });
  }
};

/**
 * 9. GET /api/friends/compare/:friendId - Deep Head-to-Head Comparison
 */
exports.compareWithFriend = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const friendId = Number(req.params.friendId);

    if (!friendId) {
      return res.status(400).json({ error: 'Valid friend ID is required' });
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database connection not configured' });
    }

    // 1. Fetch both user records from DB
    const [userRes, friendRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', currentUserId).maybeSingle(),
      supabase.from('users').select('*').eq('id', friendId).maybeSingle(),
    ]);

    if (!userRes.data || !friendRes.data) {
      return res.status(404).json({ error: 'User or friend profile not found' });
    }

    const dbUser = userRes.data;
    const dbFriend = friendRes.data;

    // 2. Fetch full LeetCode profiles (including categories & contest rating) for both
    const [userLC, friendLC] = await Promise.allSettled([
      fetchFullLeetCodeProfile(dbUser.leetcode_id),
      fetchFullLeetCodeProfile(dbFriend.leetcode_id),
    ]);

    const uStats = userLC.status === 'fulfilled' ? userLC.value : {
      stats: { easy: dbUser.total_easy, medium: dbUser.total_medium, hard: dbUser.total_hard, total: dbUser.total_easy + dbUser.total_medium + dbUser.total_hard },
      contest: { rating: 1500 + Math.min(500, dbUser.total_score), globalRanking: 0, attendedContestsCount: 0, badge: '' },
      categories: [],
    };

    const fStats = friendLC.status === 'fulfilled' ? friendLC.value : {
      stats: { easy: dbFriend.total_easy, medium: dbFriend.total_medium, hard: dbFriend.total_hard, total: dbFriend.total_easy + dbFriend.total_medium + dbFriend.total_hard },
      contest: { rating: 1500 + Math.min(500, dbFriend.total_score), globalRanking: 0, attendedContestsCount: 0, badge: '' },
      categories: [],
    };

    // Calculate up-to-date scores
    const userScore = calculateScore(uStats.stats.easy, uStats.stats.medium, uStats.stats.hard);
    const friendScore = calculateScore(fStats.stats.easy, fStats.stats.medium, fStats.stats.hard);

    const userProfile = {
      ...formatUser(dbUser),
      total_easy: uStats.stats.easy,
      total_medium: uStats.stats.medium,
      total_hard: uStats.stats.hard,
      total_score: userScore,
      total_solved: uStats.stats.total || (uStats.stats.easy + uStats.stats.medium + uStats.stats.hard),
      contest_rating: uStats.contest?.rating || 1500,
      contest_rank: uStats.contest?.globalRanking || 0,
      contest_badge: uStats.contest?.badge || '',
      ranking: uStats.ranking || 0,
      avatar_url: uStats.avatar || dbUser.avatar_url,
    };

    const friendProfile = {
      ...formatUser(dbFriend),
      total_easy: fStats.stats.easy,
      total_medium: fStats.stats.medium,
      total_hard: fStats.stats.hard,
      total_score: friendScore,
      total_solved: fStats.stats.total || (fStats.stats.easy + fStats.stats.medium + fStats.stats.hard),
      contest_rating: fStats.contest?.rating || 1500,
      contest_rank: fStats.contest?.globalRanking || 0,
      contest_badge: fStats.contest?.badge || '',
      ranking: fStats.ranking || 0,
      avatar_url: fStats.avatar || dbFriend.avatar_url,
    };

    // Difficulty breakdown comparison
    const difficultyComparison = {
      easy: {
        user: userProfile.total_easy,
        friend: friendProfile.total_easy,
        delta: userProfile.total_easy - friendProfile.total_easy,
        winner: userProfile.total_easy > friendProfile.total_easy ? 'user' : userProfile.total_easy < friendProfile.total_easy ? 'friend' : 'tie',
      },
      medium: {
        user: userProfile.total_medium,
        friend: friendProfile.total_medium,
        delta: userProfile.total_medium - friendProfile.total_medium,
        winner: userProfile.total_medium > friendProfile.total_medium ? 'user' : userProfile.total_medium < friendProfile.total_medium ? 'friend' : 'tie',
      },
      hard: {
        user: userProfile.total_hard,
        friend: friendProfile.total_hard,
        delta: userProfile.total_hard - friendProfile.total_hard,
        winner: userProfile.total_hard > friendProfile.total_hard ? 'user' : userProfile.total_hard < friendProfile.total_hard ? 'friend' : 'tie',
      },
      total: {
        user: userProfile.total_solved,
        friend: friendProfile.total_solved,
        delta: userProfile.total_solved - friendProfile.total_solved,
        winner: userProfile.total_solved > friendProfile.total_solved ? 'user' : userProfile.total_solved < friendProfile.total_solved ? 'friend' : 'tie',
      },
    };

    // Topic categories breakdown comparison
    const userCats = uStats.categories || [];
    const friendCats = fStats.categories || [];

    const topicComparison = userCats.map((uCat) => {
      const fCat = friendCats.find((c) => c.id === uCat.id) || { solved: 0 };
      const delta = (uCat.solved || 0) - (fCat.solved || 0);
      return {
        id: uCat.id,
        name: uCat.name,
        icon: uCat.icon,
        userSolved: uCat.solved || 0,
        friendSolved: fCat.solved || 0,
        delta,
        winner: delta > 0 ? 'user' : delta < 0 ? 'friend' : 'tie',
      };
    });

    // Multi-Platform DPI comparison
    const uPlatforms = dbUser.platform_stats || {};
    const fPlatforms = dbFriend.platform_stats || {};

    const uDpi = calculateDPI({
      leetcode: uPlatforms.leetcode || { total_easy: uStats.stats.easy, total_medium: uStats.stats.medium, total_hard: uStats.stats.hard, total_score: userScore },
      codeforces: uPlatforms.codeforces,
      codechef: uPlatforms.codechef,
      gfg: uPlatforms.gfg,
      hackerrank: uPlatforms.hackerrank,
    });

    const fDpi = calculateDPI({
      leetcode: fPlatforms.leetcode || { total_easy: fStats.stats.easy, total_medium: fStats.stats.medium, total_hard: fStats.stats.hard, total_score: friendScore },
      codeforces: fPlatforms.codeforces,
      codechef: fPlatforms.codechef,
      gfg: fPlatforms.gfg,
      hackerrank: fPlatforms.hackerrank,
    });

    const platformsList = [
      {
        id: 'leetcode',
        name: 'LeetCode',
        icon: 'code-slash',
        color: '#FFA116',
        userScore: uDpi.breakdown.leetcodeScore,
        friendScore: fDpi.breakdown.leetcodeScore,
        userMetric: `${userProfile.total_solved} Solves`,
        friendMetric: `${friendProfile.total_solved} Solves`,
        userLinked: true,
        friendLinked: true,
      },
      {
        id: 'codeforces',
        name: 'Codeforces',
        icon: 'analytics',
        color: '#188CE5',
        userScore: uDpi.breakdown.codeforcesScore,
        friendScore: fDpi.breakdown.codeforcesScore,
        userMetric: uPlatforms.codeforces?.rating ? `${uPlatforms.codeforces.rating} Rating (${uPlatforms.codeforces.rank})` : 'Not linked',
        friendMetric: fPlatforms.codeforces?.rating ? `${fPlatforms.codeforces.rating} Rating (${fPlatforms.codeforces.rank})` : 'Not linked',
        userLinked: !!(dbUser.codeforces_id || uPlatforms.codeforces),
        friendLinked: !!(dbFriend.codeforces_id || fPlatforms.codeforces),
      },
      {
        id: 'codechef',
        name: 'CodeChef',
        icon: 'restaurant',
        color: '#5B4638',
        userScore: uDpi.breakdown.codechefScore,
        friendScore: fDpi.breakdown.codechefScore,
        userMetric: uPlatforms.codechef?.rating ? `${uPlatforms.codechef.rating} (${uPlatforms.codechef.stars})` : 'Not linked',
        friendMetric: fPlatforms.codechef?.rating ? `${fPlatforms.codechef.rating} (${fPlatforms.codechef.stars})` : 'Not linked',
        userLinked: !!(dbUser.codechef_id || uPlatforms.codechef),
        friendLinked: !!(dbFriend.codechef_id || fPlatforms.codechef),
      },
      {
        id: 'gfg',
        name: 'GeeksforGeeks',
        icon: 'leaf',
        color: '#2F8D46',
        userScore: uDpi.breakdown.gfgScore,
        friendScore: fDpi.breakdown.gfgScore,
        userMetric: uPlatforms.gfg?.score ? `${uPlatforms.gfg.score} pts (${uPlatforms.gfg.totalSolved} Solved)` : 'Not linked',
        friendMetric: fPlatforms.gfg?.score ? `${fPlatforms.gfg.score} pts (${fPlatforms.gfg.totalSolved} Solved)` : 'Not linked',
        userLinked: !!(dbUser.gfg_id || uPlatforms.gfg),
        friendLinked: !!(dbFriend.gfg_id || fPlatforms.gfg),
      },
      {
        id: 'hackerrank',
        name: 'HackerRank',
        icon: 'terminal',
        color: '#00EA64',
        userScore: uDpi.breakdown.hackerrankScore,
        friendScore: fDpi.breakdown.hackerrankScore,
        userMetric: uPlatforms.hackerrank?.badgesCount !== undefined ? `${uPlatforms.hackerrank.badgesCount} Badges (Lvl ${uPlatforms.hackerrank.level})` : 'Not linked',
        friendMetric: fPlatforms.hackerrank?.badgesCount !== undefined ? `${fPlatforms.hackerrank.badgesCount} Badges (Lvl ${fPlatforms.hackerrank.level})` : 'Not linked',
        userLinked: !!(dbUser.hackerrank_id || uPlatforms.hackerrank),
        friendLinked: !!(dbFriend.hackerrank_id || fPlatforms.hackerrank),
      },
    ].map((p) => {
      const delta = p.userScore - p.friendScore;
      const winner = delta > 0 ? 'user' : delta < 0 ? 'friend' : 'tie';
      return { ...p, delta, winner };
    });

    const userPlatformWins = platformsList.filter((p) => p.winner === 'user').length;
    const friendPlatformWins = platformsList.filter((p) => p.winner === 'friend').length;

    const multiPlatform = {
      userDpi: uDpi,
      friendDpi: fDpi,
      dpiDelta: uDpi.dpiScore - fDpi.dpiScore,
      userWins: userPlatformWins,
      friendWins: friendPlatformWins,
      platforms: platformsList,
    };

    // AI Coach strategy calculation
    const aiCoach = generateAICoachStrategy(userProfile, friendProfile, userCats, friendCats);

    const scoreDelta = userProfile.total_score - friendProfile.total_score;
    const ratingDelta = (userProfile.contest_rating || 1500) - (friendProfile.contest_rating || 1500);

    return res.json({
      user: userProfile,
      friend: friendProfile,
      scoreDelta,
      ratingDelta,
      leadingUser: scoreDelta > 0 ? 'user' : scoreDelta < 0 ? 'friend' : 'tied',
      difficultyComparison,
      topicComparison,
      multiPlatform,
      aiCoach,
    });
  } catch (e) {
    console.error('Compare With Friend Error:', e);
    return res.status(500).json({ error: 'Failed to compare with friend: ' + e.message });
  }
};
