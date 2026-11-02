import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Event } from '../types';
import { theme } from '../utils/theme';
import { motion } from '../utils/motion';
import { useFocusEffect } from '@react-navigation/native';
import EventCard from '../components/EventCard';
import ScalePressable from '../components/ScalePressable';

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: motion.duration.standard,
      easing: motion.easeOut,
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

  async function onRefresh() {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }

  function renderEventCard({ item, index }: { item: Event; index: number }) {
    return (
      <EventRowItem
        item={item}
        index={index}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="code-slash" size={16} color={theme.colors.textWhite} />
          </View>
          <Text style={styles.logoText}>CodeArena</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ScalePressable
            style={styles.avatarContainer}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Open user profile"
          >
            <Ionicons name="person-outline" size={18} color={theme.colors.textPrimary} />
          </ScalePressable>
          <ScalePressable
            style={styles.avatarContainer}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Sign out of account"
          >
            <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
          </ScalePressable>
        </View>
      </View>

      {/* Hero Welcome Section */}
      <Animated.View
        style={[
          styles.welcomeSection,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [motion.initialTranslateY, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.badgeLine}>
          <Text style={styles.monoTag}>{'<'}ARENA_DASHBOARD{'>'}</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <Text style={styles.welcomeText}>
          {user?.username ? `Welcome, ${user.username}` : 'Welcome back'}
        </Text>
        <Text style={styles.welcomeSubtext}>
          Track your algorithmic progress and compete with peers in live sprints.
        </Text>
      </Animated.View>

      {/* Action Buttons (Bento-style quick action grid with tactile press) */}
      <View style={styles.quickActions}>
        <ScalePressable
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('CreateEvent')}
          accessibilityRole="button"
          accessibilityLabel="Create a new challenge"
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="add" size={20} color={theme.colors.textWhite} />
          </View>
          <View style={styles.quickActionTextContainer}>
            <Text style={styles.quickActionTitle}>Create Challenge</Text>
            <Text style={styles.quickActionSub}>Start duel or sprint</Text>
          </View>
        </ScalePressable>

        <ScalePressable
          style={[styles.quickActionButton, styles.quickActionButtonAlt]}
          onPress={() => navigation.navigate('JoinEvent')}
          accessibilityRole="button"
          accessibilityLabel="Join challenge by invite code"
        >
          <View style={[styles.quickActionIcon, styles.quickActionIconAlt]}>
            <Ionicons name="key-outline" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.quickActionTextContainer}>
            <Text style={[styles.quickActionTitle, styles.quickActionTitleAlt]}>Join by Code</Text>
            <Text style={styles.quickActionSubAlt}>Enter invite token</Text>
          </View>
        </ScalePressable>
      </View>

      {/* Events Feed Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>Active & Upcoming Battles</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{events.length}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderEventCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="trophy-outline" size={32} color={theme.colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No active challenges</Text>
            <Text style={styles.emptyText}>
              Launch a 1v1 duel or a topic sprint to begin competing with your peers.
            </Text>
            <ScalePressable
              style={styles.emptyCtaButton}
              onPress={() => navigation.navigate('CreateEvent')}
              accessibilityRole="button"
              accessibilityLabel="Launch first tournament"
            >
              <Ionicons name="add" size={16} color={theme.colors.textWhite} />
              <Text style={styles.emptyCtaText}>Create First Challenge</Text>
            </ScalePressable>
          </View>
        }
      />
    </View>
  );
}

// Staggered list row entrance component (Recipe: Stagger a group entrance)
function EventRowItem({
  item,
  index,
  onPress,
}: {
  item: Event;
  index: number;
  onPress: () => void;
}) {
  const rowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = Math.min(index * motion.duration.staggerStep, 240);
    Animated.timing(rowAnim, {
      toValue: 1,
      duration: motion.duration.standard,
      delay,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: rowAnim,
        transform: [
          {
            translateY: rowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [motion.initialTranslateY, 0],
            }),
          },
          {
            scale: rowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [motion.initialScale, 1],
            }),
          },
        ],
      }}
    >
      <EventCard item={item} onPress={onPress} />
    </Animated.View>
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
    backgroundColor: theme.colors.background,
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
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  monoTag: {
    ...theme.typography.monoTag,
    color: theme.colors.accentMuted,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.accentMuted,
  },
  liveText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.accentMuted,
    letterSpacing: 0.5,
  },
  welcomeText: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
  },
  welcomeSubtext: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 16,
    marginBottom: 6,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    minHeight: 64,
    ...theme.shadows.sm,
  },
  quickActionButtonAlt: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconAlt: {
    backgroundColor: theme.colors.accentLight,
  },
  quickActionTextContainer: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textWhite,
    letterSpacing: -0.2,
  },
  quickActionTitleAlt: {
    color: theme.colors.textPrimary,
  },
  quickActionSub: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 1,
  },
  quickActionSubAlt: {
    fontSize: 10.5,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  countBadge: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 36,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    minHeight: 44,
  },
  emptyCtaText: {
    color: theme.colors.textWhite,
    fontSize: 12.5,
    fontWeight: '700',
  },
});
