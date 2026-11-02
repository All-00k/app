import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../services/api';
import { User, FriendRequest, SearchUserResult, RootStackParamList } from '../types';
import { theme } from '../utils/theme';
import BadgePill from '../components/BadgePill';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FriendsScreen() {
  const navigation = useNavigation<NavigationProp>();

  // Tabs: 'friends' | 'requests' | 'discover'
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'discover'>('friends');

  // State
  const [friends, setFriends] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendFilter, setFriendFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Load all friends and requests
  const loadData = useCallback(async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.getFriends().catch(() => ({ friends: [] })),
        api.getFriendRequests().catch(() => ({ incoming: [], outgoing: [] })),
      ]);

      setFriends(friendsRes.friends || []);
      setIncomingRequests(requestsRes.incoming || []);
      setOutgoingRequests(requestsRes.outgoing || []);
    } catch (err: any) {
      console.error('Failed to load friends data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Search users with debounce
  useEffect(() => {
    if (activeTab !== 'discover') return;
    const clean = searchQuery.trim();
    if (clean.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.searchUsers(clean);
        setSearchResults(res.users || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Actions
  const handleSendRequest = async (targetUser: SearchUserResult) => {
    setActionLoadingId(targetUser.id);
    try {
      const res = await api.sendFriendRequest(targetUser.id);
      Alert.alert('Success', res.message || 'Friend request sent!');
      // Update local state
      setSearchResults((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, friendship_status: 'pending_sent' } : u))
      );
      loadData();
    } catch (err: any) {
      Alert.alert('Request Failed', err.response?.data?.error || err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    setActionLoadingId(req.friendship_id);
    try {
      await api.acceptFriendRequest(req.friendship_id, req.user.id);
      Alert.alert('Connected!', `You and @${req.user.username} are now friends!`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (req: FriendRequest) => {
    setActionLoadingId(req.friendship_id);
    try {
      await api.rejectFriendRequest(req.friendship_id, req.user.id);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelOutgoing = async (req: FriendRequest) => {
    setActionLoadingId(req.friendship_id);
    try {
      await api.rejectFriendRequest(req.friendship_id, req.user.id);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFriend = (friend: User) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove @${friend.username} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(friend.id);
            try {
              await api.removeFriend(friend.id);
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || err.message);
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleCompare = (friend: User) => {
    navigation.navigate('Compare', {
      friendId: friend.id,
      friendUsername: friend.username,
      friendLeetcodeId: friend.leetcode_id,
    });
  };

  const handleChallengeDuel = (friend: User) => {
    navigation.navigate('CreateEvent', {
      mode: 'duel',
      friendId: friend.id,
      friendUsername: friend.username,
    });
  };

  // Filtered friends
  const filteredFriends = friends.filter((f) => {
    if (!friendFilter.trim()) return true;
    const q = friendFilter.toLowerCase();
    return (
      f.username.toLowerCase().includes(q) ||
      f.leetcode_id.toLowerCase().includes(q)
    );
  });

  const totalRequestsCount = incomingRequests.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Friends & Social</Text>
          <Text style={styles.headerSubtitle}>
            Connect, compete on the leaderboard & battle 1v1
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => setActiveTab('discover')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add" size={18} color={theme.colors.accent} />
          <Text style={styles.headerActionText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Segmented Tabs ─── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'friends' && styles.tabButtonActive]}
          onPress={() => setActiveTab('friends')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === 'friends' ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'requests' && styles.tabButtonActive]}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="mail-unread"
            size={16}
            color={activeTab === 'requests' ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests
          </Text>
          {totalRequestsCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{totalRequestsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'discover' && styles.tabButtonActive]}
          onPress={() => setActiveTab('discover')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="search"
            size={16}
            color={activeTab === 'discover' ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Discover
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── TAB 1: FRIENDS LIST ─── */}
      {activeTab === 'friends' && (
        <View style={styles.tabContent}>
          {/* Friends Search / Filter Bar */}
          {friends.length > 0 && (
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Filter by username or LeetCode handle..."
                placeholderTextColor={theme.colors.textTertiary}
                value={friendFilter}
                onChangeText={setFriendFilter}
              />
              {friendFilter.length > 0 && (
                <TouchableOpacity onPress={() => setFriendFilter('')}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading friends circle...</Text>
            </View>
          ) : filteredFriends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="people-outline" size={44} color={theme.colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>
                {friendFilter.length > 0 ? 'No friends match your filter' : 'No Friends Yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {friendFilter.length > 0
                  ? 'Try searching with a different keyword or handle.'
                  : 'Add your coding peers to track their live LeetCode stats, climb the friends leaderboard, and compare question solves head-to-head!'}
              </Text>
              {friendFilter.length === 0 && (
                <TouchableOpacity
                  style={styles.emptyActionButton}
                  onPress={() => setActiveTab('discover')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add" size={18} color="#061F1D" />
                  <Text style={styles.emptyActionText}>Find & Add Friends</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredFriends}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
              }
              renderItem={({ item }) => (
                <View style={styles.friendCard}>
                  {/* Top info */}
                  <View style={styles.cardHeader}>
                    <Image
                      source={{
                        uri: item.avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg',
                      }}
                      style={styles.avatar}
                    />
                    <View style={styles.userInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.username}>{item.username}</Text>
                        {item.tier && (
                          <BadgePill
                            label={item.tier}
                            color={item.tier_color || theme.colors.accent}
                            badge={item.tier_badge}
                          />
                        )}
                      </View>
                      <Text style={styles.leetcodeHandle}>@{item.leetcode_id}</Text>
                    </View>

                    {/* Remove Menu Button */}
                    <TouchableOpacity
                      style={styles.moreBtn}
                      onPress={() => handleRemoveFriend(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textTertiary} />
                    </TouchableOpacity>
                  </View>

                  {/* Problem breakdown chips */}
                  <View style={styles.statsRow}>
                    <View style={styles.statChip}>
                      <Text style={styles.statLabel}>SCORE</Text>
                      <Text style={styles.statScoreValue}>{item.total_score}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statChip}>
                      <Text style={[styles.statLabel, { color: theme.colors.easy }]}>EASY</Text>
                      <Text style={styles.statValue}>{item.total_easy}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statChip}>
                      <Text style={[styles.statLabel, { color: theme.colors.medium }]}>MED</Text>
                      <Text style={styles.statValue}>{item.total_medium}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statChip}>
                      <Text style={[styles.statLabel, { color: theme.colors.hard }]}>HARD</Text>
                      <Text style={styles.statValue}>{item.total_hard}</Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.compareBtn}
                      onPress={() => handleCompare(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="stats-chart" size={15} color="#061F1D" />
                      <Text style={styles.compareBtnText}>Compare Stats</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.duelBtn}
                      onPress={() => handleChallengeDuel(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="flash-outline" size={15} color={theme.colors.accent} />
                      <Text style={styles.duelBtnText}>1v1 Duel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ─── TAB 2: REQUESTS ─── */}
      {activeTab === 'requests' && (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
          }
        >
          {/* Incoming Requests */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Incoming Friend Requests</Text>
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>{incomingRequests.length}</Text>
            </View>
          </View>

          {incomingRequests.length === 0 ? (
            <View style={styles.emptySectionBox}>
              <Ionicons name="mail-open-outline" size={28} color={theme.colors.textTertiary} />
              <Text style={styles.emptySectionText}>No pending friend requests</Text>
            </View>
          ) : (
            incomingRequests.map((req) => (
              <View key={req.friendship_id} style={styles.requestCard}>
                <Image
                  source={{
                    uri: req.user.avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg',
                  }}
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{req.user.username}</Text>
                  <Text style={styles.leetcodeHandle}>@{req.user.leetcode_id} • Score: {req.user.total_score}</Text>
                </View>

                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptRequest(req)}
                    disabled={actionLoadingId === req.friendship_id}
                    activeOpacity={0.8}
                  >
                    {actionLoadingId === req.friendship_id ? (
                      <ActivityIndicator size="small" color="#061F1D" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#061F1D" />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleRejectRequest(req)}
                    disabled={actionLoadingId === req.friendship_id}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Outgoing Requests */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Sent Requests (Pending)</Text>
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>{outgoingRequests.length}</Text>
            </View>
          </View>

          {outgoingRequests.length === 0 ? (
            <View style={styles.emptySectionBox}>
              <Ionicons name="paper-plane-outline" size={28} color={theme.colors.textTertiary} />
              <Text style={styles.emptySectionText}>No outgoing requests waiting for approval</Text>
            </View>
          ) : (
            outgoingRequests.map((req) => (
              <View key={req.friendship_id} style={styles.requestCard}>
                <Image
                  source={{
                    uri: req.user.avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg',
                  }}
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{req.user.username}</Text>
                  <Text style={styles.leetcodeHandle}>@{req.user.leetcode_id}</Text>
                </View>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancelOutgoing(req)}
                  disabled={actionLoadingId === req.friendship_id}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ─── TAB 3: DISCOVER & ADD FRIENDS ─── */}
      {activeTab === 'discover' && (
        <View style={styles.tabContent}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={theme.colors.accent} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username, LeetCode handle, or email..."
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {searching ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {searchQuery.trim().length < 2 ? (
            <View style={styles.discoverGuideBox}>
              <Ionicons name="sparkles-outline" size={36} color={theme.colors.accent} />
              <Text style={styles.discoverGuideTitle}>Find Any CodeArena Player</Text>
              <Text style={styles.discoverGuideText}>
                Type at least 2 characters to search across our coder community by username or LeetCode ID.
              </Text>

              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
                  <Text style={styles.tipText}>Compare question counts by difficulty & topic</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
                  <Text style={styles.tipText}>Climb the private Friends Leaderboard</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
                  <Text style={styles.tipText}>Challenge any friend to an instant 1v1 Arena Duel</Text>
                </View>
              </View>
            </View>
          ) : searchResults.length === 0 && !searching ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="alert-circle-outline" size={40} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>No coders found</Text>
              <Text style={styles.emptySubtitle}>
                We couldn't find any registered user matching "{searchQuery}".
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.searchResultCard}>
                  <Image
                    source={{
                      uri: item.avatar_url || 'https://assets.leetcode.com/users/default_avatar.jpg',
                    }}
                    style={styles.avatar}
                  />
                  <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.username}>{item.username}</Text>
                      {item.tier && (
                        <BadgePill
                          label={item.tier}
                          color={item.tier_color || theme.colors.accent}
                          badge={item.tier_badge}
                        />
                      )}
                    </View>
                    <Text style={styles.leetcodeHandle}>
                      @{item.leetcode_id} • Score: {item.total_score}
                    </Text>
                  </View>

                  {/* Status / Action */}
                  {item.friendship_status === 'friends' ? (
                    <TouchableOpacity
                      style={styles.alreadyFriendsBtn}
                      onPress={() => handleCompare(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="stats-chart" size={14} color="#061F1D" />
                      <Text style={styles.alreadyFriendsText}>Compare</Text>
                    </TouchableOpacity>
                  ) : item.friendship_status === 'pending_sent' ? (
                    <View style={styles.pendingChip}>
                      <Text style={styles.pendingChipText}>Sent</Text>
                    </View>
                  ) : item.friendship_status === 'pending_received' ? (
                    <TouchableOpacity
                      style={styles.acceptSmallBtn}
                      onPress={() =>
                        handleAcceptRequest({
                          friendship_id: item.friendship_id || 0,
                          user: item,
                          created_at: new Date().toISOString(),
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.acceptSmallText}>Accept</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => handleSendRequest(item)}
                      disabled={actionLoadingId === item.id}
                      activeOpacity={0.8}
                    >
                      {actionLoadingId === item.id ? (
                        <ActivityIndicator size="small" color="#061F1D" />
                      ) : (
                        <>
                          <Ionicons name="person-add" size={14} color="#061F1D" />
                          <Text style={styles.addBtnText}>Add</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.25)',
  },
  headerActionText: {
    ...theme.typography.captionBold,
    color: theme.colors.accent,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.surfaceDark,
    ...theme.shadows.sm,
  },
  tabText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.textWhite,
  },
  tabBadge: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#061F1D',
  },
  tabContent: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
    gap: 12,
  },
  friendCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceAlt,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  username: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  leetcodeHandle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  moreBtn: {
    padding: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  statChip: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
  },
  statScoreValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.accentMuted,
    marginTop: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.border,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  compareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    gap: 6,
    ...theme.shadows.sm,
  },
  compareBtnText: {
    ...theme.typography.captionBold,
    color: '#061F1D',
  },
  duelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceDark,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 168, 0.3)',
  },
  duelBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.accent,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.full,
    marginTop: 24,
    gap: 8,
    ...theme.shadows.md,
  },
  emptyActionText: {
    ...theme.typography.bodyBold,
    color: '#061F1D',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  sectionCountPill: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  emptySectionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  emptySectionText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#061F1D',
  },
  rejectBtn: {
    padding: 7,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#061F1D',
  },
  alreadyFriendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  alreadyFriendsText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accentMuted,
  },
  pendingChip: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
  },
  pendingChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  acceptSmallBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
  },
  acceptSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#061F1D',
  },
  discoverGuideBox: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  discoverGuideTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  discoverGuideText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  tipsList: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
  },
});
