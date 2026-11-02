import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { theme } from '../utils/theme';
import { motion } from '../utils/motion';
import { useFocusEffect } from '@react-navigation/native';
import TierCard from '../components/TierCard';
import ScalePressable from '../components/ScalePressable';
import { PlatformInfo, DPIProfile } from '../types';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, refreshProfile } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  
  // Multi-Platform state
  const [platforms, setPlatforms] = useState<Record<string, PlatformInfo>>({});
  const [dpi, setDpi] = useState<DPIProfile | null>(null);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);

  // Link modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('codeforces');
  const [handleInput, setHandleInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: motion.duration.standard,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
      loadPlatforms();
    }, [])
  );

  async function loadEvents() {
    try {
      const { events } = await api.getEvents();
      setEvents(events);
    } catch {}
  }

  async function loadPlatforms() {
    try {
      setLoadingPlatforms(true);
      const res = await api.getLinkedPlatforms();
      if (res && res.platforms) {
        setPlatforms(res.platforms as any);
        setDpi(res.dpi);
      }
    } catch (err) {
      console.warn('Failed to load platforms:', err);
    } finally {
      setLoadingPlatforms(false);
    }
  }

  async function handleSyncLeetCode() {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      await api.syncUser(user.id);
      await refreshProfile();
      await loadPlatforms();
      Alert.alert('Sync Successful', 'Your LeetCode stats have been updated.');
    } catch (err: any) {
      Alert.alert('Sync Failed', err?.response?.data?.error || 'Unable to fetch LeetCode data');
    }
    setSyncing(false);
  }

  async function handleSyncAllPlatforms() {
    if (syncingAll) return;
    setSyncingAll(true);
    try {
      const res = await api.syncPlatforms();
      if (res && res.dpi) {
        setDpi(res.dpi);
        await loadPlatforms();
        await refreshProfile();
        Alert.alert('Sync Complete', 'All active platform stats & Power Index updated!');
      }
    } catch (err: any) {
      Alert.alert('Sync Failed', err?.response?.data?.error || 'Could not sync all platforms');
    } finally {
      setSyncingAll(false);
    }
  }

  function openLinkModal(platformKey: string) {
    setSelectedPlatform(platformKey);
    const existing = platforms[platformKey]?.handle || '';
    setHandleInput(existing);
    setLinkError('');
    setModalVisible(true);
  }

  async function handleSavePlatform() {
    if (!handleInput.trim()) {
      setLinkError('Please enter a valid handle or username');
      return;
    }
    setLinking(true);
    setLinkError('');

    try {
      const res = await api.linkPlatform(selectedPlatform, handleInput.trim());
      if (res && res.success) {
        setModalVisible(false);
        setHandleInput('');
        await loadPlatforms();
        Alert.alert('Connected!', res.message || `Successfully verified @${handleInput} on ${selectedPlatform}!`);
      } else {
        setLinkError(res?.error || 'Failed to verify handle.');
      }
    } catch (err: any) {
      setLinkError(err?.response?.data?.error || 'Profile verification failed. Check handle and network.');
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlinkPlatform(platformKey: string) {
    Alert.alert(
      'Unlink Profile',
      `Are you sure you want to disconnect ${platformKey}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.unlinkPlatform(platformKey);
              await loadPlatforms();
              Alert.alert('Disconnected', `${platformKey} profile unlinked.`);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Could not unlink');
            }
          },
        },
      ]
    );
  }

  function handleLogout() {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to sign out of CodeArena?')) {
        logout();
      }
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out of CodeArena?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  const totalProblems = (user?.total_easy || 0) + (user?.total_medium || 0) + (user?.total_hard || 0);
  const totalScore = user?.total_score || 0;
  const userTier = user?.tier || 'Novice Coder';
  const nextScore = user?.next_score || 50;
  const minScore = user?.min_score || 0;

  function getTierBadgeIcon(tierName: string): keyof typeof Ionicons.glyphMap {
    const lower = (tierName || '').toLowerCase();
    if (lower.includes('titan') || lower.includes('grandmaster')) return 'ribbon';
    if (lower.includes('elite') || lower.includes('architect')) return 'diamond';
    if (lower.includes('algo') || lower.includes('master')) return 'trophy';
    if (lower.includes('warrior')) return 'shield-checkmark';
    return 'shield-outline';
  }

  // Achievement badges
  const achievements = [
    {
      icon: 'trophy-outline' as const,
      label: 'First Mover',
      color: theme.colors.accentMuted,
      bg: theme.colors.accentLight,
      unlocked: events.length > 0,
    },
    {
      icon: 'sparkles-outline' as const,
      label: '50 Solves',
      color: theme.colors.warning,
      bg: theme.colors.warningLight,
      unlocked: totalProblems >= 50,
    },
    {
      icon: 'flame-outline' as const,
      label: 'Hard Crusher',
      color: theme.colors.error,
      bg: theme.colors.errorLight,
      unlocked: (user?.total_hard || 0) >= 10,
    },
    {
      icon: 'flash-outline' as const,
      label: 'Century Score',
      color: theme.colors.info,
      bg: theme.colors.infoLight,
      unlocked: totalScore >= 100,
    },
  ];

  // Recent activity list
  const recentActivity = events.slice(0, 3).map((ev: any) => ({
    icon: (ev.mode === 'duel' ? 'flash' : ev.mode === 'topic_sprint' ? 'layers' : 'flag') as keyof typeof Ionicons.glyphMap,
    iconColor: ev.mode === 'duel' ? theme.colors.error : ev.mode === 'topic_sprint' ? theme.colors.warning : theme.colors.accentMuted,
    modeLabel: ev.mode === 'duel' ? '1v1 Duel' : ev.mode === 'topic_sprint' ? 'Topic Sprint' : 'Standard Battle',
    name: ev.name,
    sub: `${ev.participant_count || 1} entrants enrolled`,
    badge: ev.status === 'active' ? 'ACTIVE' : 'JOINED',
  }));

  const platformMeta: Record<string, { label: string; icon: any; color: string; desc: string }> = {
    leetcode: { label: 'LeetCode', icon: 'code-slash', color: '#FFA116', desc: 'DSA & Topic Problems' },
    codeforces: { label: 'Codeforces', icon: 'analytics', color: '#188CE5', desc: 'Contests & Algorithmic Elo' },
    codechef: { label: 'CodeChef', icon: 'restaurant', color: '#8B5A2B', desc: 'Divisional Star Ratings' },
    gfg: { label: 'GeeksforGeeks', icon: 'leaf', color: '#2F8D46', desc: 'POTD Streaks & Practice Score' },
    hackerrank: { label: 'HackerRank', icon: 'terminal', color: '#00EA64', desc: 'Skills, Badges & Certs' },
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="code-slash" size={16} color={theme.colors.textWhite} />
          </View>
          <Text style={styles.logoText}>CodeArena</Text>
        </View>
        <ScalePressable
          onPress={handleLogout}
          style={styles.logoutButton}
          accessibilityRole="button"
          accessibilityLabel="Sign out of account"
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.textSecondary} />
        </ScalePressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Identity Bento */}
        <Animated.View
          style={[
            styles.avatarSection,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [motion.initialTranslateY, 0],
                  }),
                },
                {
                  scale: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [motion.initialScale, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={36} color={theme.colors.textWhite} />
            </View>
            <View style={styles.tierPill}>
              <Ionicons
                name={getTierBadgeIcon(userTier)}
                size={14}
                color={theme.colors.accentMuted}
              />
            </View>
          </View>
          <Text style={styles.userName}>{user?.username || 'Player'}</Text>
          <Text style={styles.userBio}>LeetCode Handle: @{user?.leetcode_id || 'unlinked'}</Text>

          {/* Action buttons */}
          <View style={styles.profileActions}>
            <ScalePressable
              style={styles.syncProfileButton}
              onPress={handleSyncLeetCode}
              disabled={syncing}
              accessibilityRole="button"
              accessibilityLabel="Sync profile with LeetCode"
            >
              {syncing ? (
                <ActivityIndicator color={theme.colors.textWhite} size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="sync-outline" size={15} color={theme.colors.textWhite} />
                  <Text style={styles.syncProfileText}>Sync LeetCode</Text>
                </View>
              )}
            </ScalePressable>
          </View>
        </Animated.View>

        {/* ─── ⚡ DEVELOPER POWER INDEX (DPI) HERO CARD ─── */}
        <View style={styles.dpiHeroCard}>
          <View style={styles.dpiHeaderRow}>
            <View style={styles.dpiTitleBadge}>
              <Ionicons name="flash" size={14} color="#061F1D" />
              <Text style={styles.dpiBadgeText}>GLOBAL DEVELOPER POWER INDEX</Text>
            </View>
            <TouchableOpacity
              style={styles.syncAllButton}
              onPress={handleSyncAllPlatforms}
              disabled={syncingAll}
              activeOpacity={0.7}
            >
              {syncingAll ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="refresh" size={12} color={theme.colors.accent} />
                  <Text style={styles.syncAllText}>Sync All</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.dpiScoreSection}>
            <View>
              <Text style={styles.dpiScoreLabel}>TOTAL POWER SCORE</Text>
              <View style={styles.dpiScoreRow}>
                <Text style={styles.dpiScoreVal}>
                  {(dpi?.dpiScore || totalScore * 10).toLocaleString()}
                </Text>
                <Text style={styles.dpiScoreUnit}>DPI</Text>
              </View>
            </View>
            <View style={[styles.dpiTierBadgeBox, { borderColor: dpi?.dpiColor || theme.colors.accent }]}>
              <Text style={styles.dpiTierBadgeEmoji}>{dpi?.dpiBadge || '🥉'}</Text>
              <Text style={[styles.dpiTierBadgeTitle, { color: dpi?.dpiColor || theme.colors.accent }]}>
                {dpi?.dpiTier || 'Bronze Developer'}
              </Text>
            </View>
          </View>

          {/* Platform Contribution Breakdown Bar */}
          {dpi?.breakdown && (
            <View style={styles.dpiBreakdownBox}>
              <Text style={styles.breakdownTitle}>CROSS-PLATFORM POWER WEIGHTS</Text>
              <View style={styles.breakdownChips}>
                <View style={[styles.breakChip, { borderColor: '#FFA116' }]}>
                  <Text style={[styles.breakChipLabel, { color: '#FFA116' }]}>LeetCode</Text>
                  <Text style={styles.breakChipVal}>+{dpi.breakdown.leetcodeScore}</Text>
                </View>
                <View style={[styles.breakChip, { borderColor: '#188CE5' }]}>
                  <Text style={[styles.breakChipLabel, { color: '#188CE5' }]}>Codeforces</Text>
                  <Text style={styles.breakChipVal}>+{dpi.breakdown.codeforcesScore}</Text>
                </View>
                <View style={[styles.breakChip, { borderColor: '#8B5A2B' }]}>
                  <Text style={[styles.breakChipLabel, { color: '#8B5A2B' }]}>CodeChef</Text>
                  <Text style={styles.breakChipVal}>+{dpi.breakdown.codechefScore}</Text>
                </View>
                <View style={[styles.breakChip, { borderColor: '#2F8D46' }]}>
                  <Text style={[styles.breakChipLabel, { color: '#2F8D46' }]}>GFG</Text>
                  <Text style={styles.breakChipVal}>+{dpi.breakdown.gfgScore}</Text>
                </View>
                <View style={[styles.breakChip, { borderColor: '#00EA64' }]}>
                  <Text style={[styles.breakChipLabel, { color: '#00EA64' }]}>HackerRank</Text>
                  <Text style={styles.breakChipVal}>+{dpi.breakdown.hackerrankScore}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ─── 🌐 CONNECTED CODING PLATFORMS ─── */}
        <View style={styles.platformsSection}>
          <View style={styles.platformsHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Connected Coding Profiles</Text>
              <Text style={styles.sectionSubtitle}>Link handles to aggregate unified cross-platform power</Text>
            </View>
          </View>

          <View style={styles.platformCardsGrid}>
            {Object.keys(platformMeta).map((key) => {
              const meta = platformMeta[key];
              const pInfo = platforms[key];
              const isLinked = !!pInfo?.linked;
              const handle = pInfo?.handle || '';
              const stats = pInfo?.stats;

              let metric1 = '';
              let metric2 = '';

              if (key === 'leetcode') {
                metric1 = `${totalProblems} Solved`;
                metric2 = `${totalScore} Arena Pts`;
              } else if (key === 'codeforces') {
                metric1 = stats?.rating ? `${stats.rating} Elo (${stats.rank})` : 'Unrated';
                metric2 = stats?.totalSolved ? `${stats.totalSolved} Solved` : '0 Solved';
              } else if (key === 'codechef') {
                metric1 = stats?.rating ? `${stats.rating} Rating (${stats.stars})` : 'Unrated';
                metric2 = stats?.totalSolved ? `${stats.totalSolved} Solved` : '0 Solved';
              } else if (key === 'gfg') {
                metric1 = stats?.score ? `${stats.score} Coding Score` : '0 Score';
                metric2 = stats?.totalSolved ? `${stats.totalSolved} Solved` : '0 Solved';
              } else if (key === 'hackerrank') {
                metric1 = stats?.level ? `Level ${stats.level} (${stats.rank || 'Coder'})` : 'Coder';
                metric2 = stats?.badgesCount !== undefined ? `${stats.badgesCount} Badges` : '0 Badges';
              }

              return (
                <View key={key} style={[styles.platformCard, isLinked && styles.platformCardLinked]}>
                  <View style={styles.platformCardTop}>
                    <View style={styles.platformIconAndName}>
                      <View style={[styles.platformIconBox, { backgroundColor: meta.color + '1F', borderColor: meta.color + '40' }]}>
                        <Ionicons name={meta.icon} size={18} color={meta.color} />
                      </View>
                      <View>
                        <Text style={styles.platformName}>{meta.label}</Text>
                        <Text style={styles.platformHandle}>
                          {isLinked ? `@${handle}` : 'Not connected'}
                        </Text>
                      </View>
                    </View>

                    {key !== 'leetcode' && (
                      <View style={styles.platformActionButtons}>
                        {isLinked ? (
                          <TouchableOpacity
                            style={styles.unlinkMiniBtn}
                            onPress={() => handleUnlinkPlatform(key)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={13} color={theme.colors.error} />
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          style={[styles.platformBtn, isLinked ? styles.platformBtnEdit : styles.platformBtnConnect]}
                          onPress={() => openLinkModal(key)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.platformBtnText, isLinked && styles.platformBtnTextEdit]}>
                            {isLinked ? 'Edit' : 'Connect'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {key === 'leetcode' && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                      </View>
                    )}
                  </View>

                  {/* Live Metrics Row if Linked */}
                  {isLinked && (
                    <View style={styles.platformMetricsRow}>
                      <View style={styles.pMetricBox}>
                        <Text style={styles.pMetricVal}>{metric1}</Text>
                      </View>
                      <View style={styles.pMetricDivider} />
                      <View style={styles.pMetricBox}>
                        <Text style={styles.pMetricVal}>{metric2}</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Tier Card with scale pressable */}
        <ScalePressable>
          <TierCard
            tier={userTier}
            score={totalScore}
            nextScore={nextScore}
            minScore={minScore}
          />
        </ScalePressable>

        {/* Friends & Head-to-Head Hub Banner */}
        <ScalePressable
          style={styles.friendsHubBanner}
          onPress={() => (navigation as any).navigate('Friends')}
          accessibilityRole="button"
          accessibilityLabel="Open Friends & Social Hub"
        >
          <View style={styles.friendsHubLeft}>
            <View style={styles.friendsHubIconBox}>
              <Ionicons name="people" size={20} color="#061F1D" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.friendsHubTitle}>Friends & Social Hub</Text>
                <View style={styles.newPill}>
                  <Text style={styles.newPillText}>SOCIAL</Text>
                </View>
              </View>
              <Text style={styles.friendsHubSub}>
                1v1 LeetCode & Multi-Platform comparison, leaderboard & duels
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.accent} />
        </ScalePressable>

        {/* Aggregate Stats Cards */}
        <View style={styles.statsRow}>
          <ScalePressable style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>ARENA POINTS</Text>
              <View style={styles.statIcon}>
                <Ionicons name="star-outline" size={14} color={theme.colors.accentMuted} />
              </View>
            </View>
            <Text style={styles.statValue}>{totalScore.toLocaleString()}</Text>
            <Text style={styles.statChange}>Weighted score total</Text>
          </ScalePressable>

          <ScalePressable style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>PROBLEMS SOLVED</Text>
              <View style={styles.statIcon}>
                <Ionicons name="code-working-outline" size={14} color={theme.colors.accentMuted} />
              </View>
            </View>
            <Text style={styles.statValue}>{totalProblems}</Text>
            <Text style={styles.statChange}>Lifetime completions</Text>
          </ScalePressable>
        </View>

        {/* Problem Breakdown by Difficulty */}
        <View style={styles.difficultySection}>
          <Text style={styles.sectionTitle}>Problem Breakdown</Text>
          <View style={styles.difficultyRow}>
            {/* Easy Card */}
            <ScalePressable style={styles.difficultyCard}>
              <View style={[styles.diffBadge, { backgroundColor: theme.colors.easyLight }]}>
                <Text style={[styles.diffBadgeText, { color: theme.colors.easy }]}>EASY</Text>
              </View>
              <Text style={[styles.difficultyValue, { color: theme.colors.textPrimary }]}>
                {user?.total_easy || 0}
              </Text>
              <Text style={styles.difficultyPoints}>1 pt / solve</Text>
            </ScalePressable>

            {/* Medium Card */}
            <ScalePressable style={styles.difficultyCard}>
              <View style={[styles.diffBadge, { backgroundColor: theme.colors.mediumLight }]}>
                <Text style={[styles.diffBadgeText, { color: theme.colors.medium }]}>MEDIUM</Text>
              </View>
              <Text style={[styles.difficultyValue, { color: theme.colors.textPrimary }]}>
                {user?.total_medium || 0}
              </Text>
              <Text style={styles.difficultyPoints}>3 pts / solve</Text>
            </ScalePressable>

            {/* Hard Card */}
            <ScalePressable style={styles.difficultyCard}>
              <View style={[styles.diffBadge, { backgroundColor: theme.colors.hardLight }]}>
                <Text style={[styles.diffBadgeText, { color: theme.colors.hard }]}>HARD</Text>
              </View>
              <Text style={[styles.difficultyValue, { color: theme.colors.textPrimary }]}>
                {user?.total_hard || 0}
              </Text>
              <Text style={styles.difficultyPoints}>5 pts / solve</Text>
            </ScalePressable>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.achievementSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((a, i) => (
              <ScalePressable
                key={i}
                style={[
                  styles.achievementCard,
                  !a.unlocked && styles.achievementCardLocked,
                ]}
              >
                <View
                  style={[
                    styles.achievementIcon,
                    { backgroundColor: a.unlocked ? a.bg : theme.colors.surfaceAlt },
                  ]}
                >
                  <Ionicons
                    name={a.icon}
                    size={20}
                    color={a.unlocked ? a.color : theme.colors.textTertiary}
                  />
                </View>
                <Text
                  style={[
                    styles.achievementLabel,
                    !a.unlocked && { color: theme.colors.textTertiary },
                  ]}
                  numberOfLines={1}
                >
                  {a.label}
                </Text>
                <Text style={styles.achievementStatus}>
                  {a.unlocked ? 'Unlocked' : 'Locked'}
                </Text>
              </ScalePressable>
            ))}
          </View>
        </View>

        {/* Recent Battle Activity */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Battle History</Text>

          {recentActivity.length > 0 ? (
            recentActivity.map((activity, i) => (
              <View key={i} style={styles.activityRow}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: activity.iconColor + '18' },
                  ]}
                >
                  <Ionicons name={activity.icon} size={16} color={activity.iconColor} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityText} numberOfLines={1}>
                    {activity.modeLabel}: {activity.name}
                  </Text>
                  <Text style={styles.activitySub}>{activity.sub}</Text>
                </View>
                {activity.badge && (
                  <View style={styles.activityBadgeBox}>
                    <Text style={styles.activityBadgeText}>{activity.badge}</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Ionicons name="time-outline" size={16} color={theme.colors.textTertiary} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityText}>No recent activity</Text>
                <Text style={styles.activitySub}>Join or launch a challenge to begin</Text>
              </View>
            </View>
          )}
        </View>

        {/* Prominent Log Out Button */}
        <View style={styles.logoutSection}>
          <ScalePressable
            style={styles.prominentLogoutButton}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Log out of account"
          >
            <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
            <Text style={styles.prominentLogoutText}>Log Out of CodeArena</Text>
          </ScalePressable>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ─── LINK PLATFORM MODAL ─── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.modalPlatformIcon, { backgroundColor: platformMeta[selectedPlatform]?.color + '20' }]}>
                  <Ionicons
                    name={platformMeta[selectedPlatform]?.icon || 'globe-outline'}
                    size={20}
                    color={platformMeta[selectedPlatform]?.color || theme.colors.accent}
                  />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Connect {platformMeta[selectedPlatform]?.label}</Text>
                  <Text style={styles.modalSub}>{platformMeta[selectedPlatform]?.desc}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalInputLabel}>PROFILE HANDLE / USERNAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={`e.g. tourist or ${user?.username?.toLowerCase() || 'handle'}`}
                placeholderTextColor={theme.colors.textTertiary}
                value={handleInput}
                onChangeText={(t) => {
                  setHandleInput(t);
                  if (linkError) setLinkError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {linkError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
                  <Text style={styles.errorText}>{linkError}</Text>
                </View>
              ) : null}

              <Text style={styles.modalTip}>
                🔒 We verify public rating & solved statistics directly from {platformMeta[selectedPlatform]?.label}. No passwords required.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={linking}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSavePlatform}
                disabled={linking}
              >
                {linking ? (
                  <ActivityIndicator size="small" color="#061F1D" />
                ) : (
                  <Text style={styles.modalSubmitText}>Verify & Connect</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  prominentLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  prominentLogoutText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 14,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primaryLight,
  },
  tierPill: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    ...theme.shadows.sm,
  },
  userName: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  userBio: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  syncProfileButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    ...theme.shadows.sm,
  },
  syncProfileText: {
    color: theme.colors.textWhite,
    fontSize: 12.5,
    fontWeight: '700',
  },

  // ─── DPI Hero Card ───
  dpiHeroCard: {
    backgroundColor: theme.colors.surfaceDark,
    borderRadius: theme.borderRadius.xxl,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.3)',
    ...theme.shadows.lg,
  },
  dpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dpiTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  dpiBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#061F1D',
    letterSpacing: 0.5,
  },
  syncAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(45, 212, 168, 0.15)',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.3)',
  },
  syncAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  dpiScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dpiScoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    letterSpacing: 0.6,
  },
  dpiScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  dpiScoreVal: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.textWhite,
    letterSpacing: -1,
  },
  dpiScoreUnit: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  dpiTierBadgeBox: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dpiTierBadgeEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  dpiTierBadgeTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dpiBreakdownBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 10,
  },
  breakdownTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  breakdownChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  breakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  breakChipLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  breakChipVal: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },

  // ─── Connected Platforms Section ───
  platformsSection: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  platformsHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  platformCardsGrid: {
    gap: 10,
    marginTop: 8,
  },
  platformCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  platformCardLinked: {
    borderColor: 'rgba(45, 212, 168, 0.35)',
  },
  platformCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  platformIconAndName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  platformIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  platformName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  platformHandle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  platformActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unlinkMiniBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.errorLight,
  },
  platformBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  platformBtnConnect: {
    backgroundColor: theme.colors.primary,
  },
  platformBtnEdit: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  platformBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.textWhite,
  },
  platformBtnTextEdit: {
    color: theme.colors.textPrimary,
  },
  primaryBadge: {
    backgroundColor: 'rgba(255, 161, 22, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 161, 22, 0.3)',
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFA116',
    letterSpacing: 0.5,
  },
  platformMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  pMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  pMetricVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  pMetricDivider: {
    width: 1,
    height: 14,
    backgroundColor: theme.colors.border,
  },

  // ─── Modal Styles ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xxl,
    padding: 20,
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingBottom: 12,
  },
  modalPlatformIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalSub: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 18,
  },
  modalInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.errorLight,
    padding: 8,
    borderRadius: theme.borderRadius.md,
    marginTop: 8,
  },
  errorText: {
    fontSize: 11.5,
    color: theme.colors.error,
    fontWeight: '600',
    flex: 1,
  },
  modalTip: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 10,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  modalSubmitBtn: {
    flex: 1.5,
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#061F1D',
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    fontSize: 9.5,
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  statChange: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },

  difficultySection: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  difficultyCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginBottom: 6,
  },
  diffBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  difficultyValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  difficultyPoints: {
    fontSize: 10.5,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },

  achievementSection: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  achievementsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  achievementCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  achievementCardLocked: {
    opacity: 0.55,
    backgroundColor: theme.colors.surfaceAlt,
  },
  achievementIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  achievementLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  achievementStatus: {
    fontSize: 9.5,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },

  activitySection: {
    paddingHorizontal: 20,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  activitySub: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  activityBadgeBox: {
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.accentMuted,
  },
  friendsHubBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceDark,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    padding: 14,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.25)',
    ...theme.shadows.md,
  },
  friendsHubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  friendsHubIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsHubTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textWhite,
  },
  friendsHubSub: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  newPill: {
    backgroundColor: 'rgba(45, 212, 168, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: theme.borderRadius.full,
  },
  newPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.5,
  },
});
