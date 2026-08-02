import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { theme } from '../utils/theme';
import { useFocusEffect } from '@react-navigation/native';
import TierCard from '../components/TierCard';

export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  async function loadEvents() {
    try {
      const { events } = await api.getEvents();
      setEvents(events);
    } catch {}
  }

  async function handleSync() {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      await api.syncUser(user.id);
      await refreshProfile();
      Alert.alert('Success', 'LeetCode stats synced!');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Sync failed');
    }
    setSyncing(false);
  }

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  const totalProblems = (user?.total_easy || 0) + (user?.total_medium || 0) + (user?.total_hard || 0);
  const totalScore = user?.total_score || 0;
  const userTier = user?.tier || 'Novice Coder';
  const tierBadge = user?.tier_badge || '🥉';
  const nextScore = user?.next_score || 50;
  const minScore = user?.min_score || 0;
  const tierProgress = Math.min(100, Math.max(0, ((totalScore - minScore) / Math.max(1, nextScore - minScore)) * 100));

  // Achievement badges
  const achievements = [
    {
      icon: 'trophy',
      label: 'First Mover',
      color: theme.colors.accent,
      bg: theme.colors.accentLight,
      count: events.length > 0 ? 1 : 0,
    },
    {
      icon: 'star',
      label: 'Problem Solver',
      color: theme.colors.warning,
      bg: '#FEF3C7',
      count: totalProblems >= 50 ? 1 : 0,
    },
    {
      icon: 'flame',
      label: 'Hard Crusher',
      color: theme.colors.error,
      bg: '#FEE2E2',
      count: (user?.total_hard || 0) >= 10 ? 1 : 0,
    },
    {
      icon: 'flash',
      label: 'Speed Coder',
      color: theme.colors.info,
      bg: '#DBEAFE',
      count: totalScore >= 100 ? 1 : 0,
    },
  ];

  // Recent activity mock
  const recentActivity = events.slice(0, 3).map((ev: any) => ({
    icon: ev.mode === 'duel' ? 'flash' : ev.mode === 'topic_sprint' ? 'code-working' : 'trophy',
    iconColor: ev.mode === 'duel' ? theme.colors.error : ev.mode === 'topic_sprint' ? theme.colors.warning : theme.colors.accent,
    text: `${ev.mode === 'duel' ? '⚔️ Duel' : ev.mode === 'topic_sprint' ? '🏷️ Topic Sprint' : '🏆 Event'}: "${ev.name}"`,
    sub: `${ev.participant_count || 0} participants`,
    badge: ev.status === 'active' ? 'ACTIVE' : 'JOINED',
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="code-slash" size={18} color={theme.colors.textWhite} />
          </View>
          <Text style={styles.logoText}>CodeArena</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <Animated.View style={[styles.avatarSection, { opacity: fadeAnim }]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={theme.colors.textWhite} />
            </View>
            <View style={styles.tierPill}>
              <Text style={styles.tierPillText}>{tierBadge}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.username || 'User'}</Text>
          <Text style={styles.userBio}>LeetCode: @{user?.leetcode_id || 'unknown'}</Text>

          {/* Action buttons */}
          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.editProfileButton} onPress={handleSync} activeOpacity={0.8}>
              {syncing ? (
                <ActivityIndicator color={theme.colors.textWhite} size="small" />
              ) : (
                <Text style={styles.editProfileText}>Sync LeetCode</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton}>
              <Ionicons name="share-outline" size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Tier Card */}
        <TierCard
          tier={userTier}
          badge={tierBadge}
          score={totalScore}
          nextScore={nextScore}
          minScore={minScore}
        />

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>TOTAL{'\n'}POINTS</Text>
              <View style={styles.statIcon}>
                <Ionicons name="star" size={16} color={theme.colors.accent} />
              </View>
            </View>
            <Text style={styles.statValue}>{totalScore.toLocaleString()}</Text>
            <Text style={styles.statChange}>
              <Text style={{ color: theme.colors.success }}>+12%</Text>
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statLabel}>PROBLEMS{'\n'}SOLVED</Text>
              <View style={styles.statIcon}>
                <Ionicons name="bar-chart" size={16} color={theme.colors.accent} />
              </View>
            </View>
            <Text style={styles.statValue}>{totalProblems}</Text>
            <Text style={styles.statChange}>Total</Text>
          </View>
        </View>

        {/* Difficulty Breakdown */}
        <View style={styles.difficultySection}>
          <Text style={styles.sectionTitle}>Problem Breakdown</Text>
          <View style={styles.difficultyRow}>
            <View style={[styles.difficultyCard, { borderLeftColor: theme.colors.easy }]}>
              <Text style={[styles.difficultyValue, { color: theme.colors.easy }]}>
                {user?.total_easy || 0}
              </Text>
              <Text style={styles.difficultyLabel}>Easy</Text>
              <Text style={styles.difficultyPoints}>×1 pt</Text>
            </View>
            <View style={[styles.difficultyCard, { borderLeftColor: theme.colors.medium }]}>
              <Text style={[styles.difficultyValue, { color: theme.colors.medium }]}>
                {user?.total_medium || 0}
              </Text>
              <Text style={styles.difficultyLabel}>Medium</Text>
              <Text style={styles.difficultyPoints}>×3 pts</Text>
            </View>
            <View style={[styles.difficultyCard, { borderLeftColor: theme.colors.hard }]}>
              <Text style={[styles.difficultyValue, { color: theme.colors.hard }]}>
                {user?.total_hard || 0}
              </Text>
              <Text style={styles.difficultyLabel}>Hard</Text>
              <Text style={styles.difficultyPoints}>×5 pts</Text>
            </View>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.achievementSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Achievements & Badges</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsScroll}
          >
            {achievements.map((a, i) => (
              <View key={i} style={styles.achievementCard}>
                <View style={[styles.achievementIcon, { backgroundColor: a.bg }]}>
                  {a.count > 0 && (
                    <View style={styles.achievementBadge}>
                      <Text style={styles.achievementBadgeText}>{a.count}</Text>
                    </View>
                  )}
                  <Ionicons name={a.icon as any} size={24} color={a.color} />
                </View>
                <Text style={styles.achievementLabel}>{a.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Battles</Text>

          {recentActivity.length > 0 ? recentActivity.map((activity, i) => (
            <View key={i} style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: activity.iconColor + '15' }]}>
                <Ionicons name={activity.icon as any} size={18} color={activity.iconColor} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityText} numberOfLines={1}>{activity.text}</Text>
                <Text style={styles.activitySub}>{activity.sub}</Text>
              </View>
              {activity.badge && (
                <Text style={styles.activityBadge}>{activity.badge}</Text>
              )}
            </View>
          )) : (
            <View style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Ionicons name="time-outline" size={18} color={theme.colors.textTertiary} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityText}>No recent activity</Text>
                <Text style={styles.activitySub}>Join an event or 1v1 duel to start!</Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  logoutButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 16 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 28, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  tierPill: { position: 'absolute', bottom: -4, right: -4, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.accent, ...theme.shadows.sm },
  tierPillText: { fontSize: 18 },
  userName: { ...theme.typography.h2, color: theme.colors.textPrimary, marginBottom: 4 },
  userBio: { ...theme.typography.body, color: theme.colors.textSecondary },
  profileActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  editProfileButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: theme.borderRadius.full, ...theme.shadows.sm },
  editProfileText: { color: theme.colors.textWhite, fontSize: 13, fontWeight: '700' },
  shareButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.border },
  
  // Tier Card
  tierCard: { marginHorizontal: 20, backgroundColor: theme.colors.primary, borderRadius: 20, padding: 18, marginBottom: 20, ...theme.shadows.md },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  tierBadgeBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  tierTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  tierSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  tierBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  tierBarFill: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: 3 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 18, ...theme.shadows.sm },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statLabel: { ...theme.typography.label, color: theme.colors.textSecondary, lineHeight: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  statValue: { ...theme.typography.stat, color: theme.colors.textPrimary },
  statChange: { ...theme.typography.caption, color: theme.colors.textTertiary, marginTop: 4 },
  difficultySection: { paddingHorizontal: 20, marginBottom: 20 },
  difficultyRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  difficultyCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 14, borderLeftWidth: 3, ...theme.shadows.sm },
  difficultyValue: { fontSize: 24, fontWeight: '800' },
  difficultyLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  difficultyPoints: { ...theme.typography.caption, color: theme.colors.textTertiary, marginTop: 2 },
  sectionTitle: { ...theme.typography.h3, color: theme.colors.textPrimary },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAllText: { ...theme.typography.captionBold, color: theme.colors.accent },
  achievementSection: { paddingHorizontal: 20, marginBottom: 24 },
  achievementsScroll: { gap: 16, paddingTop: 14 },
  achievementCard: { alignItems: 'center', width: 80 },
  achievementIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  achievementBadge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: theme.colors.error, alignItems: 'center', justifyContent: 'center' },
  achievementBadgeText: { fontSize: 10, fontWeight: '800', color: theme.colors.textWhite },
  achievementLabel: { ...theme.typography.caption, color: theme.colors.textPrimary, marginTop: 8, textAlign: 'center' },
  activitySection: { paddingHorizontal: 20 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  activityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activityInfo: { flex: 1 },
  activityText: { ...theme.typography.bodyBold, color: theme.colors.textPrimary },
  activitySub: { ...theme.typography.caption, color: theme.colors.textTertiary, marginTop: 2 },
  activityBadge: { ...theme.typography.captionBold, color: theme.colors.accent },
});
