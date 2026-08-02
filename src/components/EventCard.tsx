import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../types';
import { theme } from '../utils/theme';

interface EventCardProps {
  item: Event;
  onPress: () => void;
}

export default function EventCard({ item, onPress }: EventCardProps) {
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

  const statusStyle = getStatusStyle(item.status);
  const daysLeft = getDaysLeft(item.end_date);

  return (
    <TouchableOpacity style={styles.eventCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.eventCardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>

          {item.mode === 'duel' && (
            <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.statusText, { color: '#EF4444' }]}>⚔️ 1v1 Duel</Text>
            </View>
          )}
          {item.mode === 'topic_sprint' && (
            <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.statusText, { color: '#D97706' }]}>🏷️ {item.topic || 'Topic'}</Text>
            </View>
          )}
        </View>

        {item.status === 'active' && <Text style={styles.daysLeftText}>{daysLeft}d left</Text>}
      </View>

      <Text style={styles.eventName}>{item.name}</Text>
      {item.description ? <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text> : null}

      <View style={styles.eventStatsRow}>
        <View style={styles.eventStat}>
          <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.eventStatText}>{item.participant_count || 0} members</Text>
        </View>
        <View style={styles.eventStat}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.eventStatText}>{item.duration_days} days</Text>
        </View>
        <View style={styles.eventStat}>
          <Ionicons name="key-outline" size={16} color={theme.colors.accent} />
          <Text style={[styles.eventStatText, { color: theme.colors.accent, fontWeight: '600' }]}>
            {item.invite_code}
          </Text>
        </View>
      </View>

      {item.status === 'active' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, ((item.duration_days - daysLeft) / item.duration_days) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Day {item.duration_days - daysLeft} of {item.duration_days}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  daysLeftText: { ...theme.typography.captionBold, color: theme.colors.textSecondary },
  eventName: { ...theme.typography.h3, color: theme.colors.textPrimary, marginBottom: 4 },
  eventDesc: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  eventStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  eventStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventStatText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  progressContainer: { marginTop: 14 },
  progressBarBg: { height: 4, backgroundColor: theme.colors.borderLight, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: 2 },
  progressText: { ...theme.typography.caption, color: theme.colors.textTertiary, marginTop: 6, textAlign: 'right' },
});
