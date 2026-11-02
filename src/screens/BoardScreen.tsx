import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Platform,
  Dimensions,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Event, LeaderboardEntry, FriendsLeaderboardEntry, DPILeaderboardEntry } from '../types';
import { theme } from '../utils/theme';
import { motion } from '../utils/motion';
import { useFocusEffect } from '@react-navigation/native';
import ScalePressable from '../components/ScalePressable';
import BadgePill from '../components/BadgePill';

const { width } = Dimensions.get('window');

type LeaderboardMode = 'events' | 'friends' | 'dpi';
type FilterTab = 'all_time' | 'this_week' | 'active' | 'completed';

export default function BoardScreen({ navigation }: any) {
  const { user } = useAuth();

  // Mode: 'events' (Tournaments) | 'friends' (Friends circle) | 'dpi' (Global Power Index)
  const [mode, setMode] = useState<LeaderboardMode>('events');

  // Event leaderboard state
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all_time');

  // Friends leaderboard state
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<FriendsLeaderboardEntry[]>([]);
  const [friendsUserRank, setFriendsUserRank] = useState<number>(1);
  const [friendsTotal, setFriendsTotal] = useState<number>(0);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // DPI leaderboard state
  const [dpiLeaderboard, setDpiLeaderboard] = useState<DPILeaderboardEntry[]>([]);
  const [loadingDpi, setLoadingDpi] = useState(false);

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

  const loadData = useCallback(async () => {
    try {
      if (mode === 'events') {
        const { events } = await api.getEvents();
        setEvents(events);
        const activeEvent = events.find((e: Event) => e.status === 'active') || events[0];
        if (activeEvent) {
          setSelectedEvent(activeEvent);
          const { leaderboard } = await api.getLeaderboard(activeEvent.id);
          setLeaderboard(leaderboard);
        }
      } else if (mode === 'friends') {
        setLoadingFriends(true);
        const res = await api.getFriendsLeaderboard();
        setFriendsLeaderboard(res.leaderboard || []);
        setFriendsUserRank(res.userRank || 1);
        setFriendsTotal(res.totalFriends || 0);
        setLoadingFriends(false);
      } else if (mode === 'dpi') {
        setLoadingDpi(true);
        const res = await api.getDPILeaderboard();
        setDpiLeaderboard(res.leaderboard || []);
        setLoadingDpi(false);
      }
    } catch (e) {
      setLoadingFriends(false);
      setLoadingDpi(false);
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      if (mode === 'events' && selectedEvent) {
        await api.syncEvent(selectedEvent.id);
        const { leaderboard } = await api.getLeaderboard(selectedEvent.id);
        setLeaderboard(leaderboard);
      } else if (mode === 'friends' && user?.id) {
        await api.syncUser(user.id);
        const res = await api.getFriendsLeaderboard();
        setFriendsLeaderboard(res.leaderboard || []);
        setFriendsUserRank(res.userRank || 1);
        setFriendsTotal(res.totalFriends || 0);
      } else if (mode === 'dpi') {
        await api.syncPlatforms();
        const res = await api.getDPILeaderboard();
        setDpiLeaderboard(res.leaderboard || []);
      }
    } catch {}
    setSyncing(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
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

  const friendsTop3 = friendsLeaderboard.slice(0, 3);
  const dpiTop3 = dpiLeaderboard.slice(0, 3);
  const dpiRest = dpiLeaderboard.slice(3);

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all_time', label: 'All Time' },
    { key: 'this_week', label: 'This Week' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="trophy" size={16} color={theme.colors.textWhite} />
          </View>
          <Text style={styles.logoText}>CodeArena Standings</Text>
        </View>
        <ScalePressable
          onPress={handleSync}
          style={styles.syncButton}
          disabled={syncing}
          accessibilityRole="button"
          accessibilityLabel="Sync leaderboard"
        >
          {syncing ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Ionicons
              name="sync-outline"
              size={18}
              color={theme.colors.textSecondary}
            />
          )}
        </ScalePressable>
      </View>

      {/* ─── 3-Way Mode Switcher ─── */}
      <View style={styles.modeToggleContainer}>
        <TouchableOpacity
          style={[styles.modeToggleBtn, mode === 'events' && styles.modeToggleBtnActive]}
          onPress={() => setMode('events')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="flash-outline"
            size={13}
            color={mode === 'events' ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text style={[styles.modeToggleText, mode === 'events' && styles.modeToggleTextActive]}>
            Tournaments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeToggleBtn, mode === 'friends' && styles.modeToggleBtnActive]}
          onPress={() => setMode('friends')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="people-outline"
            size={13}
            color={mode === 'friends' ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text style={[styles.modeToggleText, mode === 'friends' && styles.modeToggleTextActive]}>
            Friends Circle
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeToggleBtn, mode === 'dpi' && styles.modeToggleBtnActive]}
          onPress={() => setMode('dpi')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="globe-outline"
            size={13}
            color={mode === 'dpi' ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text style={[styles.modeToggleText, mode === 'dpi' && styles.modeToggleTextActive]}>
            Global DPI
          </Text>
        </TouchableOpacity>
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
        {mode === 'events' ? (
          // ══════════════════════════════════════════════════════
          // MODE 1: ARENA TOURNAMENTS
          // ══════════════════════════════════════════════════════
          <>
            {/* Global Standings Overview */}
            <Animated.View
              style={[
                styles.rankCard,
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
              <View style={styles.rankCardContent}>
                <View style={styles.rankCardHeaderRow}>
                  <Text style={styles.rankCardLabel}>ARENA LEADERBOARD</Text>
                  <View style={styles.liveChip}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveChipText}>LIVE</Text>
                  </View>
                </View>
                <Text style={styles.rankCardTitle}>Your Current Standing</Text>
                <View style={styles.rankNumberRow}>
                  <Text style={styles.rankNumber}>
                    {userRank ? `#${userRank}` : 'Unranked'}
                  </Text>
                  <Text style={styles.rankTotal}>
                    of {leaderboard.length} {leaderboard.length === 1 ? 'competitor' : 'competitors'}
                  </Text>
                </View>

                {/* Rank Percent Progress */}
                <View style={styles.rankProgress}>
                  <Text style={styles.rankProgressLabel}>
                    {userRank
                      ? userRank === 1
                        ? '1st Place Leader'
                        : `Next Goal: Top ${Math.max(1, userRank - 1)}`
                      : 'Join battle to rank'}
                  </Text>
                  <Text style={styles.rankProgressPercent}>
                    {userRank && leaderboard.length > 0
                      ? `${Math.round(((leaderboard.length - userRank + 1) / leaderboard.length) * 100)}% percentile`
                      : '0%'}
                  </Text>
                </View>
                <View style={styles.rankProgressBarBg}>
                  <View
                    style={[
                      styles.rankProgressBarFill,
                      {
                        width:
                          userRank && leaderboard.length > 0
                            ? `${((leaderboard.length - userRank + 1) / leaderboard.length) * 100}%`
                            : '0%',
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.rankCardIcon}>
                <Ionicons name="trophy" size={24} color={theme.colors.gold} />
              </View>
            </Animated.View>

            {/* Event Selector Horizontal Pills */}
            {events.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventSelector}
              >
                {events.map((ev) => (
                  <ScalePressable
                    key={ev.id}
                    style={[
                      styles.eventPill,
                      selectedEvent?.id === ev.id && styles.eventPillActive,
                    ]}
                    onPress={() => {
                      setSelectedEvent(ev);
                      api.getLeaderboard(ev.id).then((r) => setLeaderboard(r.leaderboard));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select challenge ${ev.name}`}
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
                  </ScalePressable>
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
                <ScalePressable
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
                </ScalePressable>
              ))}
            </ScrollView>

            {/* Top 3 Podium */}
            {top3.length > 0 && <PodiumSection top3={top3} />}

            {/* Section Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Standings Table</Text>
              <Text style={styles.sectionMeta}>{leaderboard.length} ranked</Text>
            </View>

            {/* Rest of leaderboard (4th place onwards) */}
            {rest.map((entry, index) => (
              <LeaderboardRowItem
                key={entry.id}
                entry={entry}
                index={index}
                isCurrentUser={entry.user_id === user?.id}
              />
            ))}

            {/* User rank highlight if beyond top 3 */}
            {userRank && userRank > 3 && userEntry && (
              <View style={styles.userRankRow}>
                <Text style={styles.userRankNumber}>#{userRank}</Text>
                <View style={styles.userRankAvatar}>
                  <Ionicons name="person" size={15} color={theme.colors.primary} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.userRankName}>
                    Your Current Standing ({user?.username})
                  </Text>
                  <Text style={styles.userRankSub}>
                    {userRank <= 10 ? 'Top 10 Competitor' : `Top ${Math.round((userRank / leaderboard.length) * 100)}% of arena`}
                  </Text>
                </View>
                <View style={styles.rowScoreContainer}>
                  <Text style={styles.userRankScore}>
                    {userEntry.score.toLocaleString()} pts
                  </Text>
                  <Text style={styles.userRankActive}>Active battle</Text>
                </View>
              </View>
            )}

            {/* Empty state */}
            {leaderboard.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="bar-chart-outline" size={32} color={theme.colors.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>No Leaderboard Entries</Text>
                <Text style={styles.emptyText}>
                  Join an event and sync your LeetCode profile to populate arena standings.
                </Text>
              </View>
            )}
          </>
        ) : mode === 'friends' ? (
          // ══════════════════════════════════════════════════════
          // MODE 2: FRIENDS CIRCLE LEADERBOARD
          // ══════════════════════════════════════════════════════
          <>
            {/* Friends Standing Card */}
            <View style={styles.friendsHeroCard}>
              <View style={styles.friendsHeroHeader}>
                <View style={styles.friendsBadge}>
                  <Ionicons name="people" size={13} color="#061F1D" />
                  <Text style={styles.friendsBadgeText}>FRIENDS CIRCLE</Text>
                </View>
                <Text style={styles.friendsTotalText}>
                  {friendsTotal} {friendsTotal === 1 ? 'Friend' : 'Friends'} Connected
                </Text>
              </View>

              <View style={styles.friendsRankRow}>
                <View>
                  <Text style={styles.friendsRankTitle}>Your Circle Rank</Text>
                  <Text style={styles.friendsRankVal}>
                    #{friendsUserRank} <Text style={styles.friendsRankOf}>of {friendsLeaderboard.length}</Text>
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addFriendCTA}
                  onPress={() => navigation.navigate('Friends')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add" size={14} color="#061F1D" />
                  <Text style={styles.addFriendCTAText}>Add Friends</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingFriends ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
                <Text style={styles.loadingText}>Loading friends leaderboard...</Text>
              </View>
            ) : friendsLeaderboard.length <= 1 && friendsTotal === 0 ? (
              <View style={styles.emptyFriendsBox}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="people-outline" size={36} color={theme.colors.accent} />
                </View>
                <Text style={styles.emptyTitle}>Build Your Friends Circle</Text>
                <Text style={styles.emptyText}>
                  Connect with peers to compare LeetCode performance, see who ranks highest, and analyze skill gaps head-to-head!
                </Text>
                <TouchableOpacity
                  style={styles.findFriendsBtn}
                  onPress={() => navigation.navigate('Friends')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="search" size={16} color="#061F1D" />
                  <Text style={styles.findFriendsBtnText}>Find & Add Friends</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Friends Top 3 Podium */}
                {friendsTop3.length > 0 && (
                  <FriendsPodium
                    top3={friendsTop3}
                    onCompare={(f) =>
                      navigation.navigate('Compare', {
                        friendId: f.id,
                        friendUsername: f.username,
                        friendLeetcodeId: f.leetcode_id,
                      })
                    }
                  />
                )}

                {/* Section Header */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Friends Standings</Text>
                  <Text style={styles.sectionMeta}>{friendsLeaderboard.length} ranked</Text>
                </View>

                {/* Full Friends Ranking List */}
                {friendsLeaderboard.map((item, idx) => (
                  <View
                    key={item.id}
                    style={[
                      styles.friendRankRow,
                      item.isCurrentUser && styles.friendRankRowCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.rowRank,
                        idx === 0 && { color: theme.colors.gold },
                        idx === 1 && { color: theme.colors.silver },
                        idx === 2 && { color: theme.colors.bronze },
                      ]}
                    >
                      #{item.rank}
                    </Text>

                    <Image
                      source={{
                        uri: item.avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg',
                      }}
                      style={styles.rowAvatarImg}
                    />

                    <View style={styles.rowInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.rowName, item.isCurrentUser && { color: theme.colors.accentMuted }]}>
                          {item.username} {item.isCurrentUser ? '(You)' : ''}
                        </Text>
                        {item.tier && (
                          <BadgePill
                            label={item.tier}
                            color={item.tier_color || theme.colors.accent}
                            badge={item.tier_badge}
                          />
                        )}
                      </View>
                      <Text style={styles.rowSubtext}>
                        @{item.leetcode_id} • E:{item.total_easy} M:{item.total_medium} H:{item.total_hard}
                      </Text>
                    </View>

                    <View style={styles.friendScoreAndAction}>
                      <Text style={styles.rowScore}>{item.total_score} pts</Text>
                      {!item.isCurrentUser && (
                        <TouchableOpacity
                          style={styles.compareMiniBtn}
                          onPress={() =>
                            navigation.navigate('Compare', {
                              friendId: item.id,
                              friendUsername: item.username,
                              friendLeetcodeId: item.leetcode_id,
                            })
                          }
                          activeOpacity={0.8}
                        >
                          <Ionicons name="stats-chart" size={12} color="#061F1D" />
                          <Text style={styles.compareMiniText}>Compare</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        ) : (
          // ══════════════════════════════════════════════════════
          // MODE 3: GLOBAL DEVELOPER POWER INDEX (DPI)
          // ══════════════════════════════════════════════════════
          <>
            {/* DPI Hero Overview Card */}
            <View style={styles.dpiGlobalHeroCard}>
              <View style={styles.dpiHeroHeaderRow}>
                <View style={styles.dpiGlobalBadge}>
                  <Ionicons name="flash" size={13} color="#061F1D" />
                  <Text style={styles.dpiGlobalBadgeText}>GLOBAL POWER INDEX</Text>
                </View>
                <View style={styles.liveChip}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveChipText}>MULTI-PLATFORM</Text>
                </View>
              </View>

              <Text style={styles.dpiGlobalSubtitle}>Unified Cross-Platform Rankings</Text>
              <Text style={styles.dpiGlobalDesc}>
                LeetCode • Codeforces • CodeChef • GeeksforGeeks • HackerRank
              </Text>
            </View>

            {loadingDpi ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
                <Text style={styles.loadingText}>Computing Global Power Indices...</Text>
              </View>
            ) : dpiLeaderboard.length === 0 ? (
              <View style={styles.emptyFriendsBox}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="globe-outline" size={36} color={theme.colors.accent} />
                </View>
                <Text style={styles.emptyTitle}>No Global Rankings Yet</Text>
                <Text style={styles.emptyText}>
                  Connect your coding accounts in the Profile tab and tap Sync to join the Global Developer Power Index leaderboard!
                </Text>
              </View>
            ) : (
              <>
                {/* DPI Top 3 Podium */}
                {dpiTop3.length > 0 && (
                  <DPIPodium
                    top3={dpiTop3}
                    onCompare={(entry) =>
                      navigation.navigate('Compare', {
                        friendId: entry.id,
                        friendUsername: entry.username,
                        friendLeetcodeId: entry.leetcode_id,
                      })
                    }
                  />
                )}

                {/* Section Header */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Global Leaderboard</Text>
                  <Text style={styles.sectionMeta}>{dpiLeaderboard.length} ranked developers</Text>
                </View>

                {/* Full DPI Leaderboard List */}
                {dpiLeaderboard.map((item, idx) => (
                  <View
                    key={item.id}
                    style={[
                      styles.friendRankRow,
                      item.id === user?.id && styles.friendRankRowCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.rowRank,
                        idx === 0 && { color: theme.colors.gold },
                        idx === 1 && { color: theme.colors.silver },
                        idx === 2 && { color: theme.colors.bronze },
                      ]}
                    >
                      #{item.rank}
                    </Text>

                    <Image
                      source={{
                        uri: item.avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg',
                      }}
                      style={styles.rowAvatarImg}
                    />

                    <View style={styles.rowInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.rowName, item.id === user?.id && { color: theme.colors.accentMuted }]}>
                          {item.username} {item.id === user?.id ? '(You)' : ''}
                        </Text>
                        <View style={[styles.dpiMiniTierPill, { borderColor: item.dpi_color || theme.colors.accent }]}>
                          <Text style={styles.dpiMiniTierEmoji}>{item.dpi_badge || '🥉'}</Text>
                          <Text style={[styles.dpiMiniTierText, { color: item.dpi_color || theme.colors.accent }]}>
                            {item.dpi_tier || 'Developer'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.rowSubtext}>
                        @{item.leetcode_id} • {item.active_platforms?.length || 1} platforms connected
                      </Text>
                    </View>

                    <View style={styles.friendScoreAndAction}>
                      <Text style={styles.rowScoreDPI}>{item.dpi_score.toLocaleString()} DPI</Text>
                      {item.id !== user?.id && (
                        <TouchableOpacity
                          style={styles.compareMiniBtn}
                          onPress={() =>
                            navigation.navigate('Compare', {
                              friendId: item.id,
                              friendUsername: item.username,
                              friendLeetcodeId: item.leetcode_id,
                            })
                          }
                          activeOpacity={0.8}
                        >
                          <Ionicons name="stats-chart" size={12} color="#061F1D" />
                          <Text style={styles.compareMiniText}>Compare</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// DPI Podium Component
function DPIPodium({
  top3,
  onCompare,
}: {
  top3: DPILeaderboardEntry[];
  onCompare: (f: DPILeaderboardEntry) => void;
}) {
  return (
    <View style={styles.podiumContainer}>
      {/* 2nd Place */}
      {top3.length > 1 ? (
        <TouchableOpacity
          style={[styles.podiumItem, styles.podiumSide]}
          onPress={() => onCompare(top3[1])}
          activeOpacity={0.8}
        >
          <View style={styles.podiumAvatarSmall}>
            <Image
              source={{ uri: top3[1].avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg' }}
              style={styles.podiumAvatarImgSmall}
            />
            <View style={[styles.rankPill, styles.rankPillSilver]}>
              <Text style={styles.rankPillText}>2</Text>
            </View>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>
            {top3[1].username}
          </Text>
          <Text style={styles.podiumScore}>{top3[1].dpi_score.toLocaleString()} DPI</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.podiumSide} />
      )}

      {/* 1st Place */}
      {top3.length > 0 && (
        <TouchableOpacity
          style={[styles.podiumItem, styles.podiumCenter]}
          onPress={() => onCompare(top3[0])}
          activeOpacity={0.8}
        >
          <View style={styles.podiumAvatarLarge}>
            <Image
              source={{ uri: top3[0].avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg' }}
              style={styles.podiumAvatarImgLarge}
            />
            <View style={[styles.rankPill, styles.rankPillGold]}>
              <Text style={[styles.rankPillText, styles.rankPillTextGold]}>1</Text>
            </View>
          </View>
          <Text style={[styles.podiumName, styles.podiumNameFirst]} numberOfLines={1}>
            {top3[0].username}
          </Text>
          <Text style={[styles.podiumScore, styles.podiumScoreFirst]}>
            {top3[0].dpi_score.toLocaleString()} DPI
          </Text>
        </TouchableOpacity>
      )}

      {/* 3rd Place */}
      {top3.length > 2 ? (
        <TouchableOpacity
          style={[styles.podiumItem, styles.podiumSide]}
          onPress={() => onCompare(top3[2])}
          activeOpacity={0.8}
        >
          <View style={styles.podiumAvatarSmall}>
            <Image
              source={{ uri: top3[2].avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg' }}
              style={styles.podiumAvatarImgSmall}
            />
            <View style={[styles.rankPill, styles.rankPillBronze]}>
              <Text style={styles.rankPillText}>3</Text>
            </View>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>
            {top3[2].username}
          </Text>
          <Text style={styles.podiumScore}>{top3[2].dpi_score.toLocaleString()} DPI</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.podiumSide} />
      )}
    </View>
  );
}

// Friends Podium Component
function FriendsPodium({
  top3,
  onCompare,
}: {
  top3: FriendsLeaderboardEntry[];
  onCompare: (f: FriendsLeaderboardEntry) => void;
}) {
  return (
    <View style={styles.podiumContainer}>
      {/* 2nd Place */}
      {top3.length > 1 ? (
        <TouchableOpacity
          style={[styles.podiumItem, styles.podiumSide]}
          onPress={() => onCompare(top3[1])}
          activeOpacity={0.8}
        >
          <View style={styles.podiumAvatarSmall}>
            <Image
              source={{ uri: top3[1].avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg' }}
              style={styles.podiumAvatarImgSmall}
            />
            <View style={[styles.rankPill, styles.rankPillSilver]}>
              <Text style={styles.rankPillText}>2</Text>
            </View>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>
            {top3[1].username}
          </Text>
          <Text style={styles.podiumScore}>{top3[1].total_score} pts</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.podiumSide} />
      )}

      {/* 1st Place */}
      {top3.length > 0 && (
        <TouchableOpacity
          style={[styles.podiumItem, styles.podiumCenter]}
          onPress={() => onCompare(top3[0])}
          activeOpacity={0.8}
        >
          <View style={styles.podiumAvatarLarge}>
            <Image
              source={{ uri: top3[0].avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg' }}
              style={styles.podiumAvatarImgLarge}
            />
            <View style={[styles.rankPill, styles.rankPillGold]}>
              <Text style={[styles.rankPillText, styles.rankPillTextGold]}>1</Text>
            </View>
          </View>
          <Text style={[styles.podiumName, styles.podiumNameFirst]} numberOfLines={1}>
            {top3[0].username}
          </Text>
          <Text style={[styles.podiumScore, styles.podiumScoreFirst]}>
            {top3[0].total_score} pts
          </Text>
        </TouchableOpacity>
      )}

      {/* 3rd Place */}
      {top3.length > 2 ? (
        <TouchableOpacity
          style={[styles.podiumItem, styles.podiumSide]}
          onPress={() => onCompare(top3[2])}
          activeOpacity={0.8}
        >
          <View style={styles.podiumAvatarSmall}>
            <Image
              source={{ uri: top3[2].avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg' }}
              style={styles.podiumAvatarImgSmall}
            />
            <View style={[styles.rankPill, styles.rankPillBronze]}>
              <Text style={styles.rankPillText}>3</Text>
            </View>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>
            {top3[2].username}
          </Text>
          <Text style={styles.podiumScore}>{top3[2].total_score} pts</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.podiumSide} />
      )}
    </View>
  );
}

// Podium component for Tournaments
function PodiumSection({ top3 }: { top3: LeaderboardEntry[] }) {
  return (
    <View style={styles.podiumContainer}>
      {top3.length > 1 ? (
        <View style={[styles.podiumItem, styles.podiumSide]}>
          <View style={styles.podiumAvatarSmall}>
            <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
            <View style={[styles.rankPill, styles.rankPillSilver]}>
              <Text style={styles.rankPillText}>2</Text>
            </View>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>
            {top3[1].username}
          </Text>
          <Text style={styles.podiumScore}>{top3[1].score.toLocaleString()} pts</Text>
        </View>
      ) : (
        <View style={styles.podiumSide} />
      )}

      {top3.length > 0 && (
        <View style={[styles.podiumItem, styles.podiumCenter]}>
          <View style={styles.podiumAvatarLarge}>
            <Ionicons name="person-outline" size={24} color={theme.colors.textWhite} />
            <View style={[styles.rankPill, styles.rankPillGold]}>
              <Text style={[styles.rankPillText, styles.rankPillTextGold]}>1</Text>
            </View>
          </View>
          <Text style={[styles.podiumName, styles.podiumNameFirst]} numberOfLines={1}>
            {top3[0].username}
          </Text>
          <Text style={[styles.podiumScore, styles.podiumScoreFirst]}>
            {top3[0].score.toLocaleString()} pts
          </Text>
        </View>
      )}

      {top3.length > 2 ? (
        <View style={[styles.podiumItem, styles.podiumSide]}>
          <View style={styles.podiumAvatarSmall}>
            <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
            <View style={[styles.rankPill, styles.rankPillBronze]}>
              <Text style={styles.rankPillText}>3</Text>
            </View>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>
            {top3[2].username}
          </Text>
          <Text style={styles.podiumScore}>{top3[2].score.toLocaleString()} pts</Text>
        </View>
      ) : (
        <View style={styles.podiumSide} />
      )}
    </View>
  );
}

// Staggered Leaderboard Row Component
function LeaderboardRowItem({
  entry,
  index,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  index: number;
  isCurrentUser: boolean;
}) {
  const rank = index + 4;
  const totalDeltas = entry.easy_delta + entry.medium_delta + entry.hard_delta;

  return (
    <View style={[styles.leaderboardRow, isCurrentUser && styles.leaderboardRowUser]}>
      <Text style={[styles.rowRank, isCurrentUser && { color: theme.colors.accentMuted }]}>
        {rank}
      </Text>
      <View style={[styles.rowAvatar, isCurrentUser && { backgroundColor: theme.colors.accentLight }]}>
        <Ionicons
          name="person-outline"
          size={15}
          color={isCurrentUser ? theme.colors.accentMuted : theme.colors.textSecondary}
        />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, isCurrentUser && { color: theme.colors.primary }]}>
          {entry.username} {isCurrentUser ? '(You)' : ''}
        </Text>
        <Text style={styles.rowSubtext}>
          @{entry.leetcode_id} • E:{entry.easy_delta} M:{entry.medium_delta} H:{entry.hard_delta}
        </Text>
      </View>
      <View style={styles.rowScoreContainer}>
        <Text style={[styles.rowScore, isCurrentUser && { color: theme.colors.primary }]}>
          {entry.score.toLocaleString()}
        </Text>
        <Text style={styles.rowChange}>
          {totalDeltas > 0 ? `+${totalDeltas} solves` : '0 solves'}
        </Text>
      </View>
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
  syncButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 2,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
  },
  modeToggleBtnActive: {
    backgroundColor: theme.colors.surfaceDark,
    ...theme.shadows.sm,
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  modeToggleTextActive: {
    color: theme.colors.textWhite,
  },
  rankCard: {
    backgroundColor: theme.colors.surfaceDark,
    borderRadius: theme.borderRadius.xxl,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.25)',
    ...theme.shadows.lg,
  },
  rankCardContent: {
    flex: 1,
  },
  rankCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rankCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.8,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(45, 212, 168, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  liveChipText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  rankCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textWhite,
    marginTop: 2,
    marginBottom: 8,
  },
  rankNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  rankNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.textWhite,
    letterSpacing: -1,
  },
  rankTotal: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontWeight: '600',
  },
  rankProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rankProgressLabel: {
    fontSize: 10.5,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  rankProgressPercent: {
    fontSize: 10.5,
    color: theme.colors.accent,
    fontWeight: '700',
  },
  rankProgressBarBg: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  rankProgressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.full,
  },
  rankCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── DPI Hero Card ───
  dpiGlobalHeroCard: {
    backgroundColor: theme.colors.surfaceDark,
    borderRadius: theme.borderRadius.xxl,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.3)',
    ...theme.shadows.lg,
  },
  dpiHeroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dpiGlobalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  dpiGlobalBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#061F1D',
    letterSpacing: 0.5,
  },
  dpiGlobalSubtitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textWhite,
    marginTop: 4,
  },
  dpiGlobalDesc: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },

  dpiMiniTierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dpiMiniTierEmoji: {
    fontSize: 9.5,
  },
  dpiMiniTierText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  rowScoreDPI: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.accent,
  },

  eventSelector: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  eventPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  eventPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  eventPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  eventPillTextActive: {
    color: theme.colors.textWhite,
  },
  filterTabs: {
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceAlt,
  },
  filterTabActive: {
    backgroundColor: theme.colors.accentLight,
  },
  filterTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  filterTabTextActive: {
    color: theme.colors.accentMuted,
    fontWeight: '700',
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  podiumSide: {
    paddingTop: 16,
  },
  podiumCenter: {
    paddingTop: 20,
    paddingBottom: 16,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceDark,
  },
  podiumAvatarSmall: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  podiumAvatarImgSmall: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  podiumAvatarLarge: {
    position: 'relative',
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  podiumAvatarImgLarge: {
    width: 54,
    height: 54,
    borderRadius: 18,
  },
  rankPill: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankPillGold: {
    backgroundColor: theme.colors.gold,
  },
  rankPillSilver: {
    backgroundColor: theme.colors.silver,
  },
  rankPillBronze: {
    backgroundColor: theme.colors.bronze,
  },
  rankPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },
  rankPillTextGold: {
    color: '#000000',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  podiumNameFirst: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  podiumScore: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  podiumScoreFirst: {
    color: theme.colors.accent,
    fontWeight: '700',
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
  sectionMeta: {
    fontSize: 11.5,
    color: theme.colors.textTertiary,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  leaderboardRowUser: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceDark,
  },
  rowRank: {
    width: 24,
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textTertiary,
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
  rowAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    marginRight: 10,
  },
  rowInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  rowSubtext: {
    fontSize: 10.5,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  rowScoreContainer: {
    alignItems: 'flex-end',
  },
  rowScore: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  rowChange: {
    fontSize: 10,
    color: theme.colors.accentMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  userRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceDark,
    marginHorizontal: 20,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    ...theme.shadows.md,
  },
  userRankNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.accent,
    width: 28,
  },
  userRankAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userRankName: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  userRankSub: {
    fontSize: 10.5,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  userRankScore: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  userRankActive: {
    fontSize: 9.5,
    color: theme.colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 12,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ─── Friends Circle Specific Styles ───
  friendsHeroCard: {
    backgroundColor: theme.colors.surfaceDark,
    borderRadius: theme.borderRadius.xxl,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.25)',
    ...theme.shadows.lg,
  },
  friendsHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  friendsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  friendsBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#061F1D',
    letterSpacing: 0.5,
  },
  friendsTotalText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontWeight: '600',
  },
  friendsRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendsRankTitle: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontWeight: '600',
  },
  friendsRankVal: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.textWhite,
    marginTop: 1,
  },
  friendsRankOf: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  addFriendCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
  },
  addFriendCTAText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#061F1D',
  },
  centerLoading: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyFriendsBox: {
    alignItems: 'center',
    padding: 28,
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 10,
  },
  findFriendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    marginTop: 16,
  },
  findFriendsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#061F1D',
  },
  friendRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  friendRankRowCurrent: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceDark,
  },
  friendScoreAndAction: {
    alignItems: 'flex-end',
    gap: 4,
  },
  compareMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  compareMiniText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#061F1D',
  },
});
