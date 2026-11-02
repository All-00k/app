import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Event, LeaderboardEntry } from '../types';
import { theme } from '../utils/theme';
import { motion } from '../utils/motion';
import { useFocusEffect } from '@react-navigation/native';
import ScalePressable from '../components/ScalePressable';

export default function EventDetailScreen({ route, navigation }: any) {
  const { eventId } = route.params;
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      const [ev, lb, notifs] = await Promise.all([
        api.getEvent(eventId),
        api.getLeaderboard(eventId),
        api.getNotifications(),
      ]);
      setEvent(ev.event);
      setLeaderboard(lb.leaderboard);
      setNotifications(notifs.notifications.filter((n: any) => n.event_id === eventId));
    } catch {}
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await api.syncEvent(eventId);
      await loadData();
      Alert.alert('Arena Synced', 'Leaderboard and live solve activity have been refreshed.');
    } catch (e: any) {
      Alert.alert('Sync Error', e?.response?.data?.error || 'Failed to sync arena');
    }
    setSyncing(false);
  }

  async function handleShare() {
    if (!event) return;
    try {
      await Share.share({
        message: `Join my CodeArena challenge "${event.name}"!\nInvite Code: ${event.invite_code}`,
      });
    } catch {}
  }

  function getDaysLeft() {
    if (!event) return 0;
    const diff = new Date(event.end_date).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }

  function getProgress() {
    if (!event) return 0;
    const daysLeft = getDaysLeft();
    return Math.min(100, Math.max(0, ((event.duration_days - daysLeft) / event.duration_days) * 100));
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const daysLeft = getDaysLeft();
  const userRank = leaderboard.findIndex((e) => e.user_id === user?.id) + 1;
  const elapsedDays = Math.max(1, Math.min(event.duration_days, event.duration_days - daysLeft));

  return (
    <View style={styles.container}>
      {/* App Header */}
      <View style={styles.header}>
        <ScalePressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </ScalePressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {event.name}
        </Text>
        <ScalePressable
          onPress={handleShare}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Share invite code"
        >
          <Ionicons name="share-outline" size={18} color={theme.colors.textPrimary} />
        </ScalePressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* Status Hero Card */}
        <Animated.View
          style={[
            styles.statusCard,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [motion.initialTranslateY, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>CHALLENGE STATUS</Text>
              <Text style={styles.statusValue}>{event.status.toUpperCase()}</Text>
            </View>
            <View style={styles.statusIcon}>
              <Ionicons
                name={event.status === 'active' ? 'pulse-outline' : 'time-outline'}
                size={22}
                color={theme.colors.accent}
              />
            </View>
          </View>

          <View style={styles.statusStats}>
            <View style={styles.statusStat}>
              <Text style={styles.statNum}>{leaderboard.length}</Text>
              <Text style={styles.statLbl}>Players</Text>
            </View>
            <View style={styles.statusStat}>
              <Text style={styles.statNum}>{daysLeft}d</Text>
              <Text style={styles.statLbl}>Remaining</Text>
            </View>
            <View style={styles.statusStat}>
              <Text style={styles.statNum}>{userRank > 0 ? `#${userRank}` : 'Unranked'}</Text>
              <Text style={styles.statLbl}>Your Position</Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
          </View>
          <Text style={styles.progressTxt}>
            Cycle Day {elapsedDays} of {event.duration_days}
          </Text>
        </Animated.View>

        {/* Invite Code Minimal Bento */}
        <View style={styles.inviteCard}>
          <View style={styles.inviteIcon}>
            <Ionicons name="key-outline" size={16} color={theme.colors.accentMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inviteLabel}>INVITE TOKEN</Text>
            <Text style={styles.inviteCode}>{event.invite_code}</Text>
          </View>
          <ScalePressable
            style={styles.copyButton}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share invite code"
          >
            <Ionicons name="copy-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.copyButtonText}>Share</Text>
          </ScalePressable>
        </View>

        {/* Sync Trigger Button */}
        <ScalePressable
          style={styles.syncBtn}
          onPress={handleSync}
          disabled={syncing}
          accessibilityRole="button"
          accessibilityLabel="Sync Live Solves"
        >
          {syncing ? (
            <ActivityIndicator color={theme.colors.textWhite} size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sync-outline" size={16} color={theme.colors.textWhite} />
              <Text style={styles.syncTxt}>Sync Live Solves</Text>
            </View>
          )}
        </ScalePressable>

        {/* Live Solve Push Notifications Activity Feed */}
        {notifications.length > 0 && (
          <View style={styles.notifSection}>
            <View style={styles.notifHeader}>
              <Ionicons name="flash-outline" size={15} color={theme.colors.primary} />
              <Text style={styles.notifTitle}>Live Activity Feed</Text>
            </View>
            {notifications.slice(0, 4).map((n) => (
              <View key={n.id} style={styles.notifCard}>
                <View style={styles.notifDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifText}>{n.message}</Text>
                  <Text style={styles.notifTime}>
                    {new Date(n.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Leaderboard Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Standings</Text>
          <Text style={styles.sectionCount}>{leaderboard.length} entries</Text>
        </View>

        {leaderboard.map((entry, idx) => {
          const rank = idx + 1;
          const isUser = entry.user_id === user?.id;

          return (
            <ScalePressable key={entry.id} style={[styles.row, isUser && styles.rowHighlight]}>
              <View
                style={[
                  styles.rankBadge,
                  rank === 1 && styles.rankBadgeFirst,
                  rank === 2 && styles.rankBadgeSecond,
                  rank === 3 && styles.rankBadgeThird,
                ]}
              >
                <Text
                  style={[
                    styles.rankBadgeText,
                    rank === 1 && styles.rankBadgeTextFirst,
                  ]}
                >
                  {rank}
                </Text>
              </View>

              <View
                style={[
                  styles.rowAvatar,
                  isUser && { backgroundColor: theme.colors.accentLight },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={15}
                  color={isUser ? theme.colors.accentMuted : theme.colors.textSecondary}
                />
              </View>

              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, isUser && { color: theme.colors.primary }]}>
                  {entry.username} {isUser ? '(You)' : ''}
                </Text>
                <Text style={styles.rowSub}>
                  E:{entry.easy_delta} M:{entry.medium_delta} H:{entry.hard_delta}
                </Text>
              </View>

              <View style={styles.rowScoreCol}>
                <Text style={[styles.rowScore, isUser && { color: theme.colors.primary }]}>
                  {entry.score.toLocaleString()}
                </Text>
                <Text style={styles.rowPts}>pts</Text>
              </View>
            </ScalePressable>
          );
        })}

        {leaderboard.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="people-outline" size={32} color={theme.colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No participants yet</Text>
            <Text style={styles.emptyTxt}>
              Share the invite code to begin head-to-head rankings.
            </Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  statusCard: {
    margin: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...theme.shadows.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusLabel: {
    ...theme.typography.label,
    color: theme.colors.accent,
    fontSize: 10,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textWhite,
    letterSpacing: -0.2,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 212, 168, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusStats: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 16,
  },
  statusStat: {
    alignItems: 'flex-start',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  statLbl: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 1,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 2,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  progressTxt: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 5,
    textAlign: 'right',
  },
  inviteCard: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  inviteIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteLabel: {
    ...theme.typography.label,
    fontSize: 9.5,
    color: theme.colors.textSecondary,
  },
  inviteCode: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 1.5,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  copyButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  syncBtn: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.primary,
    height: 46,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    ...theme.shadows.sm,
  },
  syncTxt: {
    color: theme.colors.textWhite,
    fontSize: 13.5,
    fontWeight: '700',
  },
  notifSection: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  notifTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 13,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  notifDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  notifText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  notifTime: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  sectionCount: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  rowHighlight: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.accent,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rankBadgeFirst: {
    backgroundColor: theme.colors.gold,
  },
  rankBadgeSecond: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rankBadgeThird: {
    backgroundColor: theme.colors.bronzeLight,
    borderWidth: 1,
    borderColor: theme.colors.bronze,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  rankBadgeTextFirst: {
    color: '#FFFFFF',
  },
  rowAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  rowSub: {
    fontSize: 10.5,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  rowScoreCol: {
    alignItems: 'flex-end',
  },
  rowScore: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  rowPts: {
    fontSize: 9.5,
    color: theme.colors.textTertiary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyTxt: {
    ...theme.typography.body,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    fontSize: 13,
  },
});
