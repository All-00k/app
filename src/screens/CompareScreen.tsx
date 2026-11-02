import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../services/api';
import { ComparisonData, User, RootStackParamList } from '../types';
import { theme } from '../utils/theme';
import BadgePill from '../components/BadgePill';

type CompareScreenRouteProp = RouteProp<RootStackParamList, 'Compare'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CompareTab = 'leetcode' | 'multi_platform';

export default function CompareScreen() {
  const route = useRoute<CompareScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();

  const [selectedFriendId, setSelectedFriendId] = useState<number>(route.params.friendId);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<CompareTab>('leetcode');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load comparison data
  const loadComparison = useCallback(async (friendId: number) => {
    try {
      setLoading(true);
      const [compData, friendsRes] = await Promise.all([
        api.getComparison(friendId),
        api.getFriends().catch(() => ({ friends: [] })),
      ]);

      setComparison(compData);
      setFriendsList(friendsRes.friends || []);
    } catch (err: any) {
      console.error('Failed to load comparison:', err);
      Alert.alert('Comparison Error', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadComparison(selectedFriendId);
  }, [selectedFriendId, loadComparison]);

  const onRefresh = () => {
    setRefreshing(true);
    loadComparison(selectedFriendId);
  };

  const handleSyncStats = async () => {
    if (!comparison) return;
    setSyncing(true);
    try {
      await Promise.allSettled([
        api.syncUser(comparison.user.id),
        api.syncUser(comparison.friend.id),
        api.syncPlatforms(),
      ]);
      await loadComparison(selectedFriendId);
      Alert.alert('Stats Synced', 'Up-to-the-minute multi-platform statistics refreshed successfully!');
    } catch (err: any) {
      Alert.alert('Sync Warning', 'Could not sync live stats: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleChallengeDuel = () => {
    if (!comparison) return;
    navigation.navigate('CreateEvent', {
      mode: 'duel',
      friendId: comparison.friend.id,
      friendUsername: comparison.friend.username,
    });
  };

  if (loading && !comparison) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>Fetching Head-to-Head Multi-Platform Analytics...</Text>
      </SafeAreaView>
    );
  }

  if (!comparison) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Could not load comparison data</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { user, friend, scoreDelta, difficultyComparison, topicComparison, aiCoach, multiPlatform } = comparison;

  // Calculate proportional bar ratios for LeetCode
  const totalUserSolved = user.total_easy + user.total_medium + user.total_hard;
  const totalFriendSolved = friend.total_easy + friend.total_medium + friend.total_hard;
  const combinedSolved = Math.max(1, totalUserSolved + totalFriendSolved);
  const userSolvedRatio = Math.round((totalUserSolved / combinedSolved) * 100);
  const friendSolvedRatio = 100 - userSolvedRatio;

  const combinedScore = Math.max(1, user.total_score + friend.total_score);
  const userScoreRatio = Math.round((user.total_score / combinedScore) * 100);
  const friendScoreRatio = 100 - userScoreRatio;

  // Multi-Platform DPI metrics
  const userDpiScore = multiPlatform?.userDpi?.dpiScore || user.total_score * 10;
  const friendDpiScore = multiPlatform?.friendDpi?.dpiScore || friend.total_score * 10;
  const dpiDelta = multiPlatform?.dpiDelta ?? (userDpiScore - friendDpiScore);
  const combinedDpi = Math.max(1, userDpiScore + friendDpiScore);
  const userDpiRatio = Math.round((userDpiScore / combinedDpi) * 100);
  const friendDpiRatio = 100 - userDpiRatio;

  const userPlatformWins = multiPlatform?.userWins ?? (scoreDelta >= 0 ? 1 : 0);
  const friendPlatformWins = multiPlatform?.friendWins ?? (scoreDelta < 0 ? 1 : 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ─── Top Navigation Bar ─── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle}>Head-to-Head Battle</Text>
          <Text style={styles.navSubtitle}>
            {activeTab === 'leetcode' ? '1v1 LeetCode & DSA Mastery' : 'Global Multi-Platform Matrix'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleSyncStats}
          disabled={syncing}
          activeOpacity={0.7}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Ionicons name="sync" size={18} color={theme.colors.accent} />
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Dual Tab Switcher ─── */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'leetcode' && styles.tabBtnActive]}
          onPress={() => setActiveTab('leetcode')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="code-slash"
            size={14}
            color={activeTab === 'leetcode' ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text style={[styles.tabBtnText, activeTab === 'leetcode' && styles.tabBtnTextActive]}>
            LeetCode DSA
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'multi_platform' && styles.tabBtnActive]}
          onPress={() => setActiveTab('multi_platform')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="grid"
            size={14}
            color={activeTab === 'multi_platform' ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text style={[styles.tabBtnText, activeTab === 'multi_platform' && styles.tabBtnTextActive]}>
            Multi-Platform Matrix
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        {/* ─── Quick Friend Switcher Carousel ─── */}
        {friendsList.length > 1 && (
          <View style={styles.switcherSection}>
            <Text style={styles.switcherLabel}>SWITCH OPPONENT:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherList}>
              {friendsList.map((f) => {
                const isSelected = f.id === selectedFriendId;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.switcherChip, isSelected && styles.switcherChipActive]}
                    onPress={() => setSelectedFriendId(f.id)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: f.avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg' }}
                      style={styles.switcherAvatar}
                    />
                    <Text style={[styles.switcherName, isSelected && styles.switcherNameActive]}>
                      @{f.username}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {activeTab === 'leetcode' ? (
          // ══════════════════════════════════════════════════════════
          // TAB 1: LEETCODE DSA MASTERY
          // ══════════════════════════════════════════════════════════
          <>
            {/* ─── Battle Hero Card ─── */}
            <View style={styles.heroCard}>
              <View style={styles.heroFightersRow}>
                {/* User Left */}
                <View style={styles.fighterCol}>
                  <View style={styles.avatarBorderUser}>
                    <Image
                      source={{ uri: user.avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg' }}
                      style={styles.fighterAvatar}
                    />
                  </View>
                  <Text style={styles.fighterUsername} numberOfLines={1}>
                    {user.username} (You)
                  </Text>
                  <Text style={styles.fighterHandle}>@{user.leetcode_id}</Text>
                  <View style={styles.fighterScorePillUser}>
                    <Text style={styles.fighterScoreText}>{user.total_score} pts</Text>
                  </View>
                  {user.tier && (
                    <View style={styles.fighterTierBox}>
                      <BadgePill
                        label={user.tier}
                        color={user.tier_color || theme.colors.accent}
                        badge={user.tier_badge}
                      />
                    </View>
                  )}
                </View>

                {/* VS Crest */}
                <View style={styles.vsCol}>
                  <View style={styles.vsCircle}>
                    <Text style={styles.vsText}>VS</Text>
                  </View>
                  <View
                    style={[
                      styles.deltaPill,
                      scoreDelta > 0
                        ? styles.deltaPillAhead
                        : scoreDelta < 0
                        ? styles.deltaPillBehind
                        : styles.deltaPillTied,
                    ]}
                  >
                    <Ionicons
                      name={scoreDelta > 0 ? 'arrow-up' : scoreDelta < 0 ? 'arrow-down' : 'remove'}
                      size={12}
                      color={
                        scoreDelta > 0
                          ? theme.colors.accentMuted
                          : scoreDelta < 0
                          ? theme.colors.warning
                          : theme.colors.info
                      }
                    />
                    <Text
                      style={[
                        styles.deltaText,
                        scoreDelta > 0
                          ? styles.deltaTextAhead
                          : scoreDelta < 0
                          ? styles.deltaTextBehind
                          : styles.deltaTextTied,
                      ]}
                    >
                      {scoreDelta > 0
                        ? `+${scoreDelta} Ahead`
                        : scoreDelta < 0
                        ? `${Math.abs(scoreDelta)} Behind`
                        : 'Tied'}
                    </Text>
                  </View>
                </View>

                {/* Friend Right */}
                <View style={styles.fighterCol}>
                  <View style={styles.avatarBorderFriend}>
                    <Image
                      source={{ uri: friend.avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg' }}
                      style={styles.fighterAvatar}
                    />
                  </View>
                  <Text style={styles.fighterUsername} numberOfLines={1}>
                    {friend.username}
                  </Text>
                  <Text style={styles.fighterHandle}>@{friend.leetcode_id}</Text>
                  <View style={styles.fighterScorePillFriend}>
                    <Text style={styles.fighterScoreText}>{friend.total_score} pts</Text>
                  </View>
                  {friend.tier && (
                    <View style={styles.fighterTierBox}>
                      <BadgePill
                        label={friend.tier}
                        color={friend.tier_color || theme.colors.gold}
                        badge={friend.tier_badge}
                      />
                    </View>
                  )}
                </View>
              </View>

              {/* Proportional Score Battle Bar */}
              <View style={styles.proportionalBarContainer}>
                <View style={styles.barLabelRow}>
                  <Text style={styles.barLabelLeft}>{userScoreRatio}% of Combined Score</Text>
                  <Text style={styles.barLabelRight}>{friendScoreRatio}%</Text>
                </View>
                <View style={styles.dualBarTrack}>
                  <View style={[styles.dualBarUser, { width: `${userScoreRatio}%` }]} />
                  <View style={[styles.dualBarFriend, { width: `${friendScoreRatio}%` }]} />
                </View>
              </View>
            </View>

            {/* ─── AI Strategy & Overtake Coach ─── */}
            <View style={styles.aiCoachCard}>
              <View style={styles.aiHeader}>
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={14} color="#061F1D" />
                  <Text style={styles.aiBadgeText}>AI BATTLE COACH</Text>
                </View>
                <View style={styles.targetScorePill}>
                  <Text style={styles.targetScoreText}>{aiCoach.fastestOvertakePlan}</Text>
                </View>
              </View>

              <Text style={styles.aiSummary}>{aiCoach.summary}</Text>

              {/* Step-by-step roadmap */}
              <View style={styles.aiStepsBox}>
                <Text style={styles.aiStepsTitle}>STRATEGIC SPRINT ROADMAP</Text>
                {aiCoach.actionSteps.map((step, idx) => (
                  <View key={idx} style={styles.aiStepItem}>
                    <Text style={styles.aiStepText}>{step}</Text>
                  </View>
                ))}
              </View>

              {/* Strengths tags */}
              <View style={styles.strengthsRow}>
                <View style={styles.strengthCol}>
                  <Text style={styles.strengthTitle}>YOUR DOMINANT AREAS</Text>
                  <View style={styles.tagsWrap}>
                    {aiCoach.userStrengths.length > 0 ? (
                      aiCoach.userStrengths.map((s, i) => (
                        <View key={i} style={styles.userTag}>
                          <Text style={styles.userTagText}>{s}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noTagsText}>Building momentum...</Text>
                    )}
                  </View>
                </View>

                <View style={styles.strengthDivider} />

                <View style={styles.strengthCol}>
                  <Text style={styles.strengthTitle}>OPPONENT'S STRONGEST</Text>
                  <View style={styles.tagsWrap}>
                    {aiCoach.friendStrengths.length > 0 ? (
                      aiCoach.friendStrengths.map((s, i) => (
                        <View key={i} style={styles.friendTag}>
                          <Text style={styles.friendTagText}>{s}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noTagsText}>No major leads</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* ─── Ratings & Key Metrics Bento Grid ─── */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>Rating & Core Metrics</Text>

              <View style={styles.metricsGrid}>
                {/* Contest Rating */}
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <Ionicons name="trophy-outline" size={18} color={theme.colors.gold} />
                    <Text style={styles.metricName}>Contest Rating</Text>
                  </View>
                  <View style={styles.metricValues}>
                    <Text style={[styles.valUser, (user.contest_rating || 0) >= (friend.contest_rating || 0) && styles.valLeader]}>
                      {user.contest_rating || 1500}
                    </Text>
                    <Text style={styles.valDivider}>vs</Text>
                    <Text style={[styles.valFriend, (friend.contest_rating || 0) >= (user.contest_rating || 0) && styles.valLeader]}>
                      {friend.contest_rating || 1500}
                    </Text>
                  </View>
                </View>

                {/* Total Questions Solved */}
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <Ionicons name="checkbox-outline" size={18} color={theme.colors.accent} />
                    <Text style={styles.metricName}>Total Solved</Text>
                  </View>
                  <View style={styles.metricValues}>
                    <Text style={[styles.valUser, totalUserSolved >= totalFriendSolved && styles.valLeader]}>
                      {totalUserSolved}
                    </Text>
                    <Text style={styles.valDivider}>vs</Text>
                    <Text style={[styles.valFriend, totalFriendSolved >= totalUserSolved && styles.valLeader]}>
                      {totalFriendSolved}
                    </Text>
                  </View>
                </View>

                {/* LeetCode Global Ranking */}
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <Ionicons name="globe-outline" size={18} color={theme.colors.info} />
                    <Text style={styles.metricName}>Global Rank</Text>
                  </View>
                  <View style={styles.metricValues}>
                    <Text style={styles.valUser}>
                      {user.ranking ? `#${user.ranking.toLocaleString()}` : 'Unranked'}
                    </Text>
                    <Text style={styles.valDivider}>vs</Text>
                    <Text style={styles.valFriend}>
                      {friend.ranking ? `#${friend.ranking.toLocaleString()}` : 'Unranked'}
                    </Text>
                  </View>
                </View>

                {/* Platform XP */}
                <View style={[styles.metricRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.metricLeft}>
                    <Ionicons name="flash-outline" size={18} color={theme.colors.accent} />
                    <Text style={styles.metricName}>Arena XP</Text>
                  </View>
                  <View style={styles.metricValues}>
                    <Text style={[styles.valUser, (user.xp || 0) >= (friend.xp || 0) && styles.valLeader]}>
                      {(user.xp || user.total_score * 10).toLocaleString()}
                    </Text>
                    <Text style={styles.valDivider}>vs</Text>
                    <Text style={[styles.valFriend, (friend.xp || 0) >= (user.xp || 0) && styles.valLeader]}>
                      {(friend.xp || friend.total_score * 10).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ─── Question Difficulty Breakdown ─── */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>Question Difficulty Comparison</Text>

              {/* Easy */}
              <View style={styles.diffCompareItem}>
                <View style={styles.diffHeader}>
                  <View style={styles.diffNameBox}>
                    <View style={[styles.diffDot, { backgroundColor: theme.colors.easy }]} />
                    <Text style={[styles.diffName, { color: theme.colors.easy }]}>Easy Solved (+1 pt)</Text>
                  </View>
                  <View style={styles.diffValuesRow}>
                    <Text style={styles.diffValUser}>{difficultyComparison.easy.user}</Text>
                    <View
                      style={[
                        styles.diffDeltaChip,
                        difficultyComparison.easy.delta >= 0 ? styles.diffDeltaPositive : styles.diffDeltaNegative,
                      ]}
                    >
                      <Text style={styles.diffDeltaText}>
                        {difficultyComparison.easy.delta >= 0
                          ? `+${difficultyComparison.easy.delta}`
                          : `${difficultyComparison.easy.delta}`}
                      </Text>
                    </View>
                    <Text style={styles.diffValFriend}>{difficultyComparison.easy.friend}</Text>
                  </View>
                </View>

                {/* Dual Bar */}
                <View style={styles.diffBarTrack}>
                  <View
                    style={[
                      styles.diffBarUser,
                      {
                        width: `${Math.round(
                          (difficultyComparison.easy.user /
                            Math.max(1, difficultyComparison.easy.user + difficultyComparison.easy.friend)) *
                            100
                        )}%`,
                        backgroundColor: theme.colors.easy,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Medium */}
              <View style={styles.diffCompareItem}>
                <View style={styles.diffHeader}>
                  <View style={styles.diffNameBox}>
                    <View style={[styles.diffDot, { backgroundColor: theme.colors.medium }]} />
                    <Text style={[styles.diffName, { color: theme.colors.medium }]}>Medium Solved (+3 pts)</Text>
                  </View>
                  <View style={styles.diffValuesRow}>
                    <Text style={styles.diffValUser}>{difficultyComparison.medium.user}</Text>
                    <View
                      style={[
                        styles.diffDeltaChip,
                        difficultyComparison.medium.delta >= 0 ? styles.diffDeltaPositive : styles.diffDeltaNegative,
                      ]}
                    >
                      <Text style={styles.diffDeltaText}>
                        {difficultyComparison.medium.delta >= 0
                          ? `+${difficultyComparison.medium.delta}`
                          : `${difficultyComparison.medium.delta}`}
                      </Text>
                    </View>
                    <Text style={styles.diffValFriend}>{difficultyComparison.medium.friend}</Text>
                  </View>
                </View>

                {/* Dual Bar */}
                <View style={styles.diffBarTrack}>
                  <View
                    style={[
                      styles.diffBarUser,
                      {
                        width: `${Math.round(
                          (difficultyComparison.medium.user /
                            Math.max(1, difficultyComparison.medium.user + difficultyComparison.medium.friend)) *
                            100
                        )}%`,
                        backgroundColor: theme.colors.medium,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Hard */}
              <View style={[styles.diffCompareItem, { marginBottom: 0 }]}>
                <View style={styles.diffHeader}>
                  <View style={styles.diffNameBox}>
                    <View style={[styles.diffDot, { backgroundColor: theme.colors.hard }]} />
                    <Text style={[styles.diffName, { color: theme.colors.hard }]}>Hard Solved (+5 pts)</Text>
                  </View>
                  <View style={styles.diffValuesRow}>
                    <Text style={styles.diffValUser}>{difficultyComparison.hard.user}</Text>
                    <View
                      style={[
                        styles.diffDeltaChip,
                        difficultyComparison.hard.delta >= 0 ? styles.diffDeltaPositive : styles.diffDeltaNegative,
                      ]}
                    >
                      <Text style={styles.diffDeltaText}>
                        {difficultyComparison.hard.delta >= 0
                          ? `+${difficultyComparison.hard.delta}`
                          : `${difficultyComparison.hard.delta}`}
                      </Text>
                    </View>
                    <Text style={styles.diffValFriend}>{difficultyComparison.hard.friend}</Text>
                  </View>
                </View>

                {/* Dual Bar */}
                <View style={styles.diffBarTrack}>
                  <View
                    style={[
                      styles.diffBarUser,
                      {
                        width: `${Math.round(
                          (difficultyComparison.hard.user /
                            Math.max(1, difficultyComparison.hard.user + difficultyComparison.hard.friend)) *
                            100
                        )}%`,
                        backgroundColor: theme.colors.hard,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* ─── DSA Topic Categories Mastery Comparison ─── */}
            <View style={styles.sectionCard}>
              <View style={styles.topicHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>DSA Topics & Problem Types</Text>
                <Text style={styles.topicHeaderSub}>You vs Opponent</Text>
              </View>

              <View style={styles.topicList}>
                {topicComparison.map((topic) => {
                  const totalTopic = Math.max(1, topic.userSolved + topic.friendSolved);
                  const uPct = Math.round((topic.userSolved / totalTopic) * 100);
                  const fPct = 100 - uPct;

                  return (
                    <View key={topic.id} style={styles.topicItem}>
                      <View style={styles.topicTitleRow}>
                        <View style={styles.topicNameBox}>
                          <Ionicons name={(topic.icon as any) || 'code-slash'} size={15} color={theme.colors.accent} />
                          <Text style={styles.topicNameText}>{topic.name}</Text>
                        </View>

                        <View style={styles.topicScoreBox}>
                          <Text style={[styles.topicValUser, topic.winner === 'user' && styles.topicValWinner]}>
                            {topic.userSolved}
                          </Text>
                          <View
                            style={[
                              styles.topicDeltaBadge,
                              topic.delta > 0
                                ? styles.topicDeltaUser
                                : topic.delta < 0
                                ? styles.topicDeltaFriend
                                : styles.topicDeltaTie,
                            ]}
                          >
                            <Text style={styles.topicDeltaText}>
                              {topic.delta > 0 ? `+${topic.delta}` : topic.delta < 0 ? `${topic.delta}` : '='}
                            </Text>
                          </View>
                          <Text style={[styles.topicValFriend, topic.winner === 'friend' && styles.topicValWinner]}>
                            {topic.friendSolved}
                          </Text>
                        </View>
                      </View>

                      {/* Dual Bar Progress */}
                      <View style={styles.topicBarTrack}>
                        <View style={[styles.topicBarUser, { width: `${uPct}%` }]} />
                        <View style={[styles.topicBarFriend, { width: `${fPct}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : (
          // ══════════════════════════════════════════════════════════
          // TAB 2: MULTI-PLATFORM POWER MATRIX
          // ══════════════════════════════════════════════════════════
          <>
            {/* ─── Global DPI Battle Hero Card ─── */}
            <View style={styles.dpiHeroCard}>
              <View style={styles.dpiCardHeader}>
                <View style={styles.dpiBadgeBox}>
                  <Ionicons name="flash" size={14} color="#061F1D" />
                  <Text style={styles.dpiBadgeTitle}>DEVELOPER POWER INDEX (DPI)</Text>
                </View>
                <View style={styles.winCounterPill}>
                  <Text style={styles.winCounterText}>
                    {userPlatformWins > friendPlatformWins
                      ? `🏆 Leading ${userPlatformWins} vs ${friendPlatformWins}`
                      : userPlatformWins < friendPlatformWins
                      ? `⚡ Trailing ${userPlatformWins} vs ${friendPlatformWins}`
                      : '⚔️ Tied Matrix'}
                  </Text>
                </View>
              </View>

              <View style={styles.dpiFightersRow}>
                {/* User DPI */}
                <View style={styles.dpiFighterCol}>
                  <Text style={styles.dpiPlayerName} numberOfLines={1}>{user.username} (You)</Text>
                  <Text style={styles.dpiScoreNumber}>{userDpiScore.toLocaleString()}</Text>
                  <View style={[styles.dpiTierPill, { borderColor: multiPlatform?.userDpi?.dpiColor || theme.colors.accent }]}>
                    <Text style={styles.dpiTierEmoji}>{multiPlatform?.userDpi?.dpiBadge || '🥉'}</Text>
                    <Text style={[styles.dpiTierText, { color: multiPlatform?.userDpi?.dpiColor || theme.colors.accent }]}>
                      {multiPlatform?.userDpi?.dpiTier || 'Developer'}
                    </Text>
                  </View>
                </View>

                {/* VS Crest */}
                <View style={styles.vsCol}>
                  <View style={styles.vsCircle}>
                    <Text style={styles.vsText}>VS</Text>
                  </View>
                  <View
                    style={[
                      styles.deltaPill,
                      dpiDelta > 0
                        ? styles.deltaPillAhead
                        : dpiDelta < 0
                        ? styles.deltaPillBehind
                        : styles.deltaPillTied,
                    ]}
                  >
                    <Ionicons
                      name={dpiDelta > 0 ? 'arrow-up' : dpiDelta < 0 ? 'arrow-down' : 'remove'}
                      size={12}
                      color={
                        dpiDelta > 0
                          ? theme.colors.accentMuted
                          : dpiDelta < 0
                          ? theme.colors.warning
                          : theme.colors.info
                      }
                    />
                    <Text
                      style={[
                        styles.deltaText,
                        dpiDelta > 0
                          ? styles.deltaTextAhead
                          : dpiDelta < 0
                          ? styles.deltaTextBehind
                          : styles.deltaTextTied,
                      ]}
                    >
                      {dpiDelta > 0
                        ? `+${dpiDelta} DPI`
                        : dpiDelta < 0
                        ? `${Math.abs(dpiDelta)} DPI`
                        : '0 DPI'}
                    </Text>
                  </View>
                </View>

                {/* Friend DPI */}
                <View style={styles.dpiFighterCol}>
                  <Text style={styles.dpiPlayerName} numberOfLines={1}>{friend.username}</Text>
                  <Text style={styles.dpiScoreNumber}>{friendDpiScore.toLocaleString()}</Text>
                  <View style={[styles.dpiTierPill, { borderColor: multiPlatform?.friendDpi?.dpiColor || theme.colors.gold }]}>
                    <Text style={styles.dpiTierEmoji}>{multiPlatform?.friendDpi?.dpiBadge || '🥉'}</Text>
                    <Text style={[styles.dpiTierText, { color: multiPlatform?.friendDpi?.dpiColor || theme.colors.gold }]}>
                      {multiPlatform?.friendDpi?.dpiTier || 'Developer'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Proportional DPI Bar */}
              <View style={styles.proportionalBarContainer}>
                <View style={styles.barLabelRow}>
                  <Text style={styles.barLabelLeft}>{userDpiRatio}% of Total Power</Text>
                  <Text style={styles.barLabelRight}>{friendDpiRatio}%</Text>
                </View>
                <View style={styles.dualBarTrack}>
                  <View style={[styles.dualBarUser, { width: `${userDpiRatio}%` }]} />
                  <View style={[styles.dualBarFriend, { width: `${friendDpiRatio}%` }]} />
                </View>
              </View>
            </View>

            {/* ─── Platform-by-Platform Matrix Clash ─── */}
            <View style={styles.sectionCard}>
              <View style={styles.topicHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Cross-Platform Head-to-Head</Text>
                <Text style={styles.topicHeaderSub}>5 Integrated Ecosystems</Text>
              </View>

              <View style={styles.platformClashList}>
                {(multiPlatform?.platforms || [
                  {
                    id: 'leetcode',
                    name: 'LeetCode',
                    icon: 'code-slash',
                    color: '#FFA116',
                    userScore: user.total_score,
                    friendScore: friend.total_score,
                    userMetric: `${totalUserSolved} Solved`,
                    friendMetric: `${totalFriendSolved} Solved`,
                    userLinked: true,
                    friendLinked: true,
                    delta: user.total_score - friend.total_score,
                    winner: user.total_score >= friend.total_score ? 'user' : 'friend',
                  },
                  {
                    id: 'codeforces',
                    name: 'Codeforces',
                    icon: 'analytics',
                    color: '#188CE5',
                    userScore: 0,
                    friendScore: 0,
                    userMetric: 'Unrated',
                    friendMetric: 'Unrated',
                    userLinked: !!user.codeforces_id,
                    friendLinked: !!friend.codeforces_id,
                    delta: 0,
                    winner: 'tie',
                  },
                  {
                    id: 'codechef',
                    name: 'CodeChef',
                    icon: 'restaurant',
                    color: '#8B5A2B',
                    userScore: 0,
                    friendScore: 0,
                    userMetric: 'Unrated',
                    friendMetric: 'Unrated',
                    userLinked: !!user.codechef_id,
                    friendLinked: !!friend.codechef_id,
                    delta: 0,
                    winner: 'tie',
                  },
                  {
                    id: 'gfg',
                    name: 'GeeksforGeeks',
                    icon: 'leaf',
                    color: '#2F8D46',
                    userScore: 0,
                    friendScore: 0,
                    userMetric: '0 Score',
                    friendMetric: '0 Score',
                    userLinked: !!user.gfg_id,
                    friendLinked: !!friend.gfg_id,
                    delta: 0,
                    winner: 'tie',
                  },
                  {
                    id: 'hackerrank',
                    name: 'HackerRank',
                    icon: 'terminal',
                    color: '#00EA64',
                    userScore: 0,
                    friendScore: 0,
                    userMetric: '0 Badges',
                    friendMetric: '0 Badges',
                    userLinked: !!user.hackerrank_id,
                    friendLinked: !!friend.hackerrank_id,
                    delta: 0,
                    winner: 'tie',
                  },
                ]).map((p: any) => {
                  const combined = Math.max(1, p.userScore + p.friendScore);
                  const uWidth = p.userScore === 0 && p.friendScore === 0 ? 50 : Math.round((p.userScore / combined) * 100);
                  const fWidth = 100 - uWidth;

                  return (
                    <View key={p.id} style={styles.platformClashCard}>
                      <View style={styles.pCardHeader}>
                        <View style={styles.pCardLeft}>
                          <View style={[styles.pIconBox, { backgroundColor: p.color + '20', borderColor: p.color + '40' }]}>
                            <Ionicons name={(p.icon as any) || 'globe'} size={16} color={p.color} />
                          </View>
                          <Text style={styles.pCardTitle}>{p.name}</Text>
                        </View>

                        {/* Winner chip */}
                        <View
                          style={[
                            styles.pWinnerChip,
                            p.winner === 'user'
                              ? styles.pWinnerChipUser
                              : p.winner === 'friend'
                              ? styles.pWinnerChipFriend
                              : styles.pWinnerChipTie,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pWinnerChipText,
                              p.winner === 'user'
                                ? styles.pWinnerChipTextUser
                                : p.winner === 'friend'
                                ? styles.pWinnerChipTextFriend
                                : styles.pWinnerChipTextTie,
                            ]}
                          >
                            {p.winner === 'user'
                              ? '🏆 You Lead'
                              : p.winner === 'friend'
                              ? `👑 @${friend.username} Leads`
                              : '🤝 Equal Standing'}
                          </Text>
                        </View>
                      </View>

                      {/* Side-by-Side Metric Details */}
                      <View style={styles.pMetricsRow}>
                        <View style={styles.pMetricColumn}>
                          <Text style={styles.pMetricValue}>{p.userMetric}</Text>
                          <Text style={styles.pMetricScore}>+{p.userScore} DPI</Text>
                        </View>

                        <Text style={styles.pMetricVs}>vs</Text>

                        <View style={[styles.pMetricColumn, { alignItems: 'flex-end' }]}>
                          <Text style={styles.pMetricValue}>{p.friendMetric}</Text>
                          <Text style={styles.pMetricScore}>+{p.friendScore} DPI</Text>
                        </View>
                      </View>

                      {/* Proportional Visual Bar */}
                      <View style={styles.pBarTrack}>
                        <View style={[styles.pBarUser, { width: `${uWidth}%`, backgroundColor: theme.colors.accent }]} />
                        <View style={[styles.pBarFriend, { width: `${fWidth}%`, backgroundColor: theme.colors.gold }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ─── Multi-Platform AI Strategic Coach ─── */}
            <View style={styles.aiCoachCard}>
              <View style={styles.aiHeader}>
                <View style={styles.aiBadge}>
                  <Ionicons name="bulb" size={14} color="#061F1D" />
                  <Text style={styles.aiBadgeText}>MULTI-PLATFORM DPI STRATEGY</Text>
                </View>
              </View>
              <Text style={styles.aiSummary}>
                {dpiDelta > 0
                  ? `You hold a commanding +${dpiDelta} DPI advantage! To cement your lead, keep solving weekly Codeforces Div 2 rounds and maintain your GFG POTD streak.`
                  : `Your opponent has an edge in multi-platform rankings. Connecting your active Codeforces or CodeChef accounts can instantly surge your DPI score by 1,000+ points!`}
              </Text>
            </View>
          </>
        )}

        {/* ─── Bottom Actions ─── */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.challengeActionBtn}
            onPress={handleChallengeDuel}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={18} color="#061F1D" />
            <Text style={styles.challengeActionText}>Challenge @{friend.username} to 1v1 Duel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshActionBtn}
            onPress={handleSyncStats}
            disabled={syncing}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color={theme.colors.accent} />
            <Text style={styles.refreshActionText}>Live Refresh All Platform Stats</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 14,
    textAlign: 'center',
  },
  errorText: {
    ...theme.typography.h3,
    color: theme.colors.error,
    marginTop: 12,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: theme.colors.surfaceDark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginTop: 16,
  },
  backButtonText: {
    color: theme.colors.textWhite,
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  navBtn: {
    padding: 6,
  },
  navTitleContainer: {
    alignItems: 'center',
  },
  navTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  navSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  syncBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accentLight,
  },

  // ─── Dual Tab Switcher ───
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.surfaceDark,
    borderColor: theme.colors.accent,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  tabBtnTextActive: {
    color: theme.colors.textWhite,
  },

  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingBottom: 48,
    gap: 16,
  },
  switcherSection: {
    marginBottom: 4,
  },
  switcherLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  switcherList: {
    gap: 8,
  },
  switcherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  switcherChipActive: {
    backgroundColor: theme.colors.surfaceDark,
    borderColor: theme.colors.accent,
  },
  switcherAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  switcherName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  switcherNameActive: {
    color: theme.colors.textWhite,
  },

  // ─── Hero Card ───
  heroCard: {
    backgroundColor: theme.colors.surfaceDark,
    borderRadius: theme.borderRadius.xxl,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.25)',
    ...theme.shadows.lg,
  },
  heroFightersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fighterCol: {
    flex: 1,
    alignItems: 'center',
  },
  avatarBorderUser: {
    padding: 3,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  avatarBorderFriend: {
    padding: 3,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: theme.colors.gold,
  },
  fighterAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  fighterUsername: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textWhite,
    marginTop: 8,
    textAlign: 'center',
  },
  fighterHandle: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  fighterScorePillUser: {
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    marginTop: 6,
  },
  fighterScorePillFriend: {
    backgroundColor: theme.colors.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    marginTop: 6,
  },
  fighterScoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  fighterTierBox: {
    marginTop: 6,
  },
  vsCol: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  vsCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  vsText: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.accent,
    letterSpacing: 1,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    gap: 3,
  },
  deltaPillAhead: {
    backgroundColor: theme.colors.accentLight,
  },
  deltaPillBehind: {
    backgroundColor: theme.colors.warningLight,
  },
  deltaPillTied: {
    backgroundColor: theme.colors.infoLight,
  },
  deltaText: {
    fontSize: 10,
    fontWeight: '800',
  },
  deltaTextAhead: {
    color: theme.colors.accentMuted,
  },
  deltaTextBehind: {
    color: theme.colors.warning,
  },
  deltaTextTied: {
    color: theme.colors.info,
  },

  proportionalBarContainer: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barLabelLeft: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  barLabelRight: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.gold,
  },
  dualBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  dualBarUser: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  dualBarFriend: {
    height: '100%',
    backgroundColor: theme.colors.gold,
  },

  // ─── DPI Hero Card (Multi-Platform) ───
  dpiHeroCard: {
    backgroundColor: theme.colors.surfaceDark,
    borderRadius: theme.borderRadius.xxl,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.35)',
    ...theme.shadows.lg,
  },
  dpiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dpiBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  dpiBadgeTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#061F1D',
  },
  winCounterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  winCounterText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  dpiFightersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dpiFighterCol: {
    flex: 1,
    alignItems: 'center',
  },
  dpiPlayerName: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  dpiScoreNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.textWhite,
    marginTop: 4,
  },
  dpiTierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 6,
  },
  dpiTierEmoji: {
    fontSize: 12,
  },
  dpiTierText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // ─── Platform Clash List ───
  platformClashList: {
    gap: 10,
    marginTop: 8,
  },
  platformClashCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  pWinnerChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  pWinnerChipUser: {
    backgroundColor: theme.colors.accentLight,
  },
  pWinnerChipFriend: {
    backgroundColor: theme.colors.goldLight,
  },
  pWinnerChipTie: {
    backgroundColor: theme.colors.surface,
  },
  pWinnerChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  pWinnerChipTextUser: {
    color: theme.colors.accentMuted,
  },
  pWinnerChipTextFriend: {
    color: theme.colors.gold,
  },
  pWinnerChipTextTie: {
    color: theme.colors.textTertiary,
  },
  pMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pMetricColumn: {
    flex: 1,
  },
  pMetricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  pMetricScore: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  pMetricVs: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    paddingHorizontal: 6,
  },
  pBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.borderLight,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pBarUser: {
    height: '100%',
  },
  pBarFriend: {
    height: '100%',
  },

  // ─── AI Coach Card ───
  aiCoachCard: {
    backgroundColor: theme.colors.surfaceDark,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.2)',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  aiBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#061F1D',
  },
  targetScorePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  targetScoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  aiSummary: {
    fontSize: 12.5,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  aiStepsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: 12,
  },
  aiStepsTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  aiStepItem: {
    paddingVertical: 2,
  },
  aiStepText: {
    fontSize: 11.5,
    color: theme.colors.textWhite,
    fontWeight: '600',
  },
  strengthsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  strengthCol: {
    flex: 1,
  },
  strengthDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  strengthTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  userTag: {
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  userTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.accentMuted,
  },
  friendTag: {
    backgroundColor: theme.colors.goldLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  friendTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.gold,
  },
  noTagsText: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },

  // ─── Section Card ───
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  sectionHeaderTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  topicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  topicHeaderSub: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },

  // ─── Metrics Grid ───
  metricsGrid: {
    marginTop: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  metricValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valUser: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  valFriend: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  valDivider: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  valLeader: {
    color: theme.colors.accentMuted,
    fontWeight: '800',
  },

  // ─── Difficulty Items ───
  diffCompareItem: {
    marginBottom: 14,
  },
  diffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  diffNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  diffName: {
    fontSize: 12,
    fontWeight: '700',
  },
  diffValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diffValUser: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  diffValFriend: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  diffDeltaChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.full,
  },
  diffDeltaPositive: {
    backgroundColor: theme.colors.accentLight,
  },
  diffDeltaNegative: {
    backgroundColor: theme.colors.warningLight,
  },
  diffDeltaText: {
    fontSize: 10,
    fontWeight: '800',
  },
  diffBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  diffBarUser: {
    height: '100%',
  },

  // ─── Topic Items ───
  topicList: {
    gap: 12,
    marginTop: 6,
  },
  topicItem: {
    gap: 4,
  },
  topicTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topicNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  topicScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topicValUser: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  topicValFriend: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  topicValWinner: {
    color: theme.colors.accentMuted,
    fontWeight: '800',
  },
  topicDeltaBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.full,
  },
  topicDeltaUser: {
    backgroundColor: theme.colors.accentLight,
  },
  topicDeltaFriend: {
    backgroundColor: theme.colors.goldLight,
  },
  topicDeltaTie: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  topicDeltaText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  topicBarTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.borderLight,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  topicBarUser: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  topicBarFriend: {
    height: '100%',
    backgroundColor: theme.colors.gold,
  },

  // ─── Actions ───
  actionsContainer: {
    gap: 10,
    marginTop: 6,
  },
  challengeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.md,
  },
  challengeActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#061F1D',
  },
  refreshActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  refreshActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});
