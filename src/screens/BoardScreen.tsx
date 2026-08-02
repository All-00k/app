import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Event, LeaderboardEntry } from '../types';
import { theme } from '../utils/theme';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

type FilterTab = 'all_time' | 'this_week' | 'active' | 'completed';

export default function BoardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all_time');
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
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
      const activeEvent = events.find((e: Event) => e.status === 'active') || events[0];
      if (activeEvent) {
        setSelectedEvent(activeEvent);
        loadLeaderboard(activeEvent.id);
      }
    } catch {}
  }

  async function loadLeaderboard(eventId: number) {
    try {
      const { leaderboard } = await api.getLeaderboard(eventId);
      setLeaderboard(leaderboard);
    } catch {}
  }

  async function handleSync() {
    if (!selectedEvent || syncing) return;
    setSyncing(true);
    try {
      await api.syncEvent(selectedEvent.id);
      await loadLeaderboard(selectedEvent.id);
    } catch {}
    setSyncing(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }

  function getUserRank() {
    const idx = leaderboard.findIndex((e) => e.user_id === user?.id);
    return idx >= 0 ? idx + 1 : null;
  }

  function getUserEntry() {
    return leaderboard.find((e) => e.user_id === user?.id);
  }

  const userRank = getUserRank();
  const userEntry = getUserEntry();
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all_time', label: 'All Time' },
    { key: 'this_week', label: 'This Week' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Past' },
  ];

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
        <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
          <Ionicons
            name="sync-outline"
            size={18}
            color={syncing ? theme.colors.accent : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        {/* Global Ranking Card */}
        <Animated.View
          style={[
            styles.rankCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.rankCardContent}>
            <Text style={styles.rankCardLabel}>GLOBAL RANKING</Text>
            <Text style={styles.rankCardTitle}>Current Status</Text>
            <Text style={styles.rankNumber}>
              #{userRank || '—'}
              <Text style={styles.rankTotal}>
                {' '}of {leaderboard.length} Players
              </Text>
            </Text>

            {/* Progress */}
            <View style={styles.rankProgress}>
              <Text style={styles.rankProgressLabel}>
                Next Milestone: Top {Math.max(1, (userRank || 1) - 1)}
              </Text>
              <Text style={styles.rankProgressPercent}>
                {userRank && leaderboard.length > 0
                  ? `${Math.round(((leaderboard.length - userRank) / leaderboard.length) * 100)}%`
                  : '0%'}
              </Text>
            </View>
            <View style={styles.rankProgressBarBg}>
              <View
                style={[
                  styles.rankProgressBarFill,
                  {
                    width: userRank && leaderboard.length > 0
                      ? `${((leaderboard.length - userRank) / leaderboard.length) * 100}%`
                      : '0%',
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.rankCardIcon}>
            <Ionicons name="trophy" size={28} color={theme.colors.accent} />
          </View>
        </Animated.View>

        {/* Event Selector - Horizontal pills */}
        {events.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventSelector}
          >
            {events.map((ev) => (
              <TouchableOpacity
                key={ev.id}
                style={[
                  styles.eventPill,
                  selectedEvent?.id === ev.id && styles.eventPillActive,
                ]}
                onPress={() => {
                  setSelectedEvent(ev);
                  loadLeaderboard(ev.id);
                }}
              >
                <Text
                  style={[
                    styles.eventPillText,
                    selectedEvent?.id === ev.id && styles.eventPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {ev.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabs}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === f.key && styles.filterTabTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Top 3 Podium */}
        {top3.length > 0 && (
          <View style={styles.podiumContainer}>
            {/* 2nd place */}
            {top3.length > 1 ? (
              <View style={[styles.podiumItem, styles.podiumSide]}>
                <View style={styles.podiumAvatarSmall}>
                  <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                </View>
                <View style={styles.podiumRankBadge}>
                  <Text style={styles.podiumRankNumber}>2</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {top3[1].username}
                </Text>
                <Text style={styles.podiumScore}>
                  {top3[1].score.toLocaleString()}
                </Text>
              </View>
            ) : <View style={styles.podiumSide} />}

            {/* 1st place */}
            {top3.length > 0 && (
              <View style={[styles.podiumItem, styles.podiumCenter]}>
                <View style={styles.podiumAvatarLarge}>
                  <Ionicons name="person" size={28} color={theme.colors.textWhite} />
                </View>
                <View style={[styles.podiumRankBadge, styles.podiumRankBadgeFirst]}>
                  <Text style={styles.podiumRankNumber}>1</Text>
                </View>
                <Text style={[styles.podiumName, styles.podiumNameFirst]} numberOfLines={1}>
                  {top3[0].username}
                </Text>
                <Text style={[styles.podiumScore, styles.podiumScoreFirst]}>
                  {top3[0].score.toLocaleString()}
                </Text>
              </View>
            )}

            {/* 3rd place */}
            {top3.length > 2 ? (
              <View style={[styles.podiumItem, styles.podiumSide]}>
                <View style={styles.podiumAvatarSmall}>
                  <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                </View>
                <View style={styles.podiumRankBadge}>
                  <Text style={styles.podiumRankNumber}>3</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {top3[2].username}
                </Text>
                <Text style={styles.podiumScore}>
                  {top3[2].score.toLocaleString()}
                </Text>
              </View>
            ) : <View style={styles.podiumSide} />}
          </View>
        )}

        {/* Rest of leaderboard */}
        {rest.map((entry, index) => {
          const rank = index + 4;
          const scoreChange = entry.score > 0 ? `+${entry.easy_delta + entry.medium_delta + entry.hard_delta}` : '0';

          return (
            <View key={entry.id} style={styles.leaderboardRow}>
              <Text style={styles.rowRank}>{rank}</Text>
              <View style={styles.rowAvatar}>
                <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{entry.username}</Text>
                <Text style={styles.rowSubtext}>{entry.leetcode_id}</Text>
              </View>
              <View style={styles.rowScoreContainer}>
                <Text style={styles.rowScore}>{entry.score.toLocaleString()}</Text>
                <Text style={[styles.rowChange, { color: entry.score > 0 ? theme.colors.success : theme.colors.textTertiary }]}>
                  {entry.score > 0 ? `↑ ${scoreChange}` : '— 0'}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Your rank highlight */}
        {userRank && userRank > 3 && userEntry && (
          <View style={styles.userRankRow}>
            <Text style={[styles.rowRank, { color: theme.colors.accent }]}>{userRank}</Text>
            <View style={[styles.rowAvatar, { backgroundColor: theme.colors.accentLight }]}>
              <Ionicons name="person" size={16} color={theme.colors.accent} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowName, { color: theme.colors.accent }]}>
                You ({user?.username})
              </Text>
              <Text style={styles.rowSubtext}>
                {userRank <= 10 ? 'Top 10' : `Top ${Math.round((userRank / leaderboard.length) * 100)}%`}
              </Text>
            </View>
            <View style={styles.rowScoreContainer}>
              <Text style={[styles.rowScore, { color: theme.colors.accent }]}>
                {userEntry.score.toLocaleString()}
              </Text>
              <Text style={[styles.rowChange, { color: theme.colors.accent }]}>Trending</Text>
            </View>
          </View>
        )}

        {/* CTA Card */}
        <View style={styles.ctaCard}>
          <Ionicons name="flash" size={32} color={theme.colors.primary} style={{ marginBottom: 8 }} />
          <Text style={styles.ctaTitle}>Aim Higher?</Text>
          <Text style={styles.ctaText}>
            Solve more LeetCode problems to climb the leaderboard and earn bonus points!
          </Text>
          <TouchableOpacity style={styles.ctaButton} onPress={handleSync} activeOpacity={0.8}>
            <Ionicons name="sync" size={16} color={theme.colors.textWhite} />
            <Text style={styles.ctaButtonText}>Sync Score</Text>
          </TouchableOpacity>
        </View>

        {/* Empty state */}
        {leaderboard.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No leaderboard data</Text>
            <Text style={styles.emptyText}>
              Join an event and sync your LeetCode profile to see rankings.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  syncButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Rank Card (dark teal)
  rankCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    flexDirection: 'row',
    ...theme.shadows.lg,
  },
  rankCardContent: {
    flex: 1,
  },
  rankCardLabel: {
    ...theme.typography.label,
    color: theme.colors.accent,
    marginBottom: 4,
  },
  rankCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textWhite,
    marginBottom: 8,
  },
  rankNumber: {
    ...theme.typography.rank,
    color: theme.colors.accent,
  },
  rankTotal: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  rankProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rankProgressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  rankProgressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  rankProgressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  rankProgressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  rankCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(45, 212, 168, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // Event selector
  eventSelector: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  eventPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  eventPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  eventPillText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  eventPillTextActive: {
    color: theme.colors.textWhite,
  },

  // Filter tabs
  filterTabs: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterTabText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  filterTabTextActive: {
    color: theme.colors.textWhite,
  },

  // Podium
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  podiumItem: {
    alignItems: 'center',
    width: (width - 60) / 3,
  },
  podiumSide: {
    width: (width - 60) / 3,
  },
  podiumCenter: {
    marginTop: -10,
  },
  podiumAvatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  podiumAvatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 3,
    borderColor: theme.colors.accent,
  },
  podiumRankBadge: {
    position: 'absolute',
    top: -4,
    right: '25%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  podiumRankBadgeFirst: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  podiumRankNumber: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  podiumName: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  podiumNameFirst: {
    fontSize: 14,
    fontWeight: '700',
  },
  podiumScore: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  podiumScoreFirst: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
  },

  // Leaderboard rows
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 8,
    ...theme.shadows.sm,
  },
  rowRank: {
    width: 28,
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  rowSubtext: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  rowScoreContainer: {
    alignItems: 'flex-end',
  },
  rowScore: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  rowChange: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // User rank highlight
  userRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 20,
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },

  // CTA
  ctaCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  ctaTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  ctaText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
    width: '100%',
    ...theme.shadows.md,
  },
  ctaButtonText: {
    color: theme.colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
