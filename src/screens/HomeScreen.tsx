import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Event } from '../types';
import { theme } from '../utils/theme';
import { useFocusEffect } from '@react-navigation/native';
import EventCard from '../components/EventCard';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
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
    } catch (err: any) {}
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case 'active':
        return { bg: theme.colors.accentLight, text: theme.colors.success, label: 'Active' };
      case 'upcoming':
        return { bg: '#EFF6FF', text: theme.colors.info, label: 'Upcoming' };
      case 'completed':
        return { bg: '#F3F4F6', text: theme.colors.textTertiary, label: 'Completed' };
      default:
        return { bg: '#F3F4F6', text: theme.colors.textTertiary, label: status };
    }
  }

  function getDaysLeft(endDate: string) {
    const diff = new Date(endDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  function renderEventCard({ item }: { item: Event }) {
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }}
      >
        <EventCard item={item} onPress={() => navigation.navigate('EventDetail', { eventId: item.id })} />
      </Animated.View>
    );
  }

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
        <TouchableOpacity style={styles.avatarContainer} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          Hey, {user?.username || 'Coder'} 👋
        </Text>
        <Text style={styles.welcomeSubtext}>
          Choose a challenge mode or join an active duel!
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('CreateEvent')}
          activeOpacity={0.8}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="add" size={22} color={theme.colors.textWhite} />
          </View>
          <Text style={styles.quickActionText}>Create Event</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionButton, styles.quickActionButtonAlt]}
          onPress={() => navigation.navigate('JoinEvent')}
          activeOpacity={0.8}
        >
          <View style={[styles.quickActionIcon, styles.quickActionIconAlt]}>
            <Ionicons name="enter-outline" size={20} color={theme.colors.primary} />
          </View>
          <Text style={[styles.quickActionText, styles.quickActionTextAlt]}>Join Code</Text>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Battles & Events</Text>
        <Text style={styles.sectionCount}>{events.length}</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderEventCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="trophy-outline" size={40} color={theme.colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No challenges active</Text>
            <Text style={styles.emptyText}>
              Launch a 1v1 Duel or Join a Topic Sprint to start competing!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.background },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  avatarContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  welcomeSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  welcomeText: { ...theme.typography.h2, color: theme.colors.textPrimary },
  welcomeSubtext: { ...theme.typography.body, color: theme.colors.textSecondary, marginTop: 4 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 20, marginBottom: 8 },
  quickActionButton: { flex: 1, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, ...theme.shadows.md },
  quickActionButtonAlt: { backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border },
  quickActionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  quickActionIconAlt: { backgroundColor: theme.colors.accentLight },
  quickActionText: { ...theme.typography.captionBold, color: theme.colors.textWhite },
  quickActionTextAlt: { color: theme.colors.textPrimary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 12, gap: 8 },
  sectionTitle: { ...theme.typography.h3, color: theme.colors.textPrimary },
  sectionCount: { ...theme.typography.captionBold, color: theme.colors.accent, backgroundColor: theme.colors.accentLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  eventCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 20, marginBottom: 12, ...theme.shadows.sm },
  eventCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  daysLeftText: { ...theme.typography.captionBold, color: theme.colors.textSecondary },
  eventName: { ...theme.typography.h3, color: theme.colors.textPrimary, marginBottom: 4 },
  eventDesc: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  eventStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  eventStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventStatText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  progressContainer: { marginTop: 14 },
  progressBarBg: { height: 4, backgroundColor: theme.colors.borderLight, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: 2 },
  progressText: { ...theme.typography.caption, color: theme.colors.textTertiary, marginTop: 6, textAlign: 'right' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { ...theme.typography.h3, color: theme.colors.textPrimary, marginBottom: 8 },
  emptyText: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
