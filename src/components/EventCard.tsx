import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../types';
import { theme } from '../utils/theme';
import ScalePressable from './ScalePressable';

interface EventCardProps {
  item: Event;
  onPress: () => void;
}

export default function EventCard({ item, onPress }: EventCardProps) {
  function getStatusStyle(status: string) {
    switch (status) {
      case 'active':
        return { bg: theme.colors.accentLight, text: theme.colors.success, label: 'Active Battle' };
      case 'upcoming':
        return { bg: theme.colors.infoLight, text: theme.colors.info, label: 'Upcoming' };
      case 'completed':
        return { bg: theme.colors.surfaceAlt, text: theme.colors.textTertiary, label: 'Completed' };
      default:
        return { bg: theme.colors.surfaceAlt, text: theme.colors.textTertiary, label: status };
    }
  }

  function getDaysLeft(endDate: string) {
    const diff = new Date(endDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  const statusStyle = getStatusStyle(item.status);
  const daysLeft = getDaysLeft(item.end_date);
  const elapsedDays = Math.max(1, Math.min(item.duration_days, item.duration_days - daysLeft));

  return (
    <ScalePressable
      style={styles.eventCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Challenge ${item.name}, status ${statusStyle.label}`}
    >
      <View style={styles.eventCardHeader}>
        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>

          {item.mode === 'duel' && (
            <View style={[styles.modeBadge, { backgroundColor: theme.colors.errorLight }]}>
              <Ionicons name="flash" size={11} color={theme.colors.error} />
              <Text style={[styles.modeBadgeText, { color: theme.colors.error }]}>1v1 Duel</Text>
            </View>
          )}

          {item.mode === 'topic_sprint' && (
            <View style={[styles.modeBadge, { backgroundColor: theme.colors.goldLight }]}>
              <Ionicons name="layers-outline" size={11} color={theme.colors.gold} />
              <Text style={[styles.modeBadgeText, { color: theme.colors.goldMuted }]}>
                {item.topic || 'Topic Sprint'}
              </Text>
            </View>
          )}
        </View>

        {item.status === 'active' && (
          <View style={styles.daysLeftPill}>
            <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.daysLeftText}>{daysLeft}d remaining</Text>
          </View>
        )}
      </View>

      <Text style={styles.eventName}>{item.name}</Text>
      {item.description ? (
        <Text style={styles.eventDesc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.eventStatsRow}>
        <View style={styles.eventStat}>
          <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.eventStatText}>
            {item.participant_count || 1} {item.participant_count === 1 ? 'entrant' : 'entrants'}
          </Text>
        </View>
        <View style={styles.eventStat}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.eventStatText}>{item.duration_days}d sprint</Text>
        </View>
        <View style={[styles.eventStat, { marginLeft: 'auto' }]}>
          <Ionicons name="key-outline" size={13} color={theme.colors.accentMuted} />
          <Text style={styles.inviteCodeText}>
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
                { width: `${Math.min(100, (elapsedDays / item.duration_days) * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.progressMetaRow}>
            <Text style={styles.progressText}>
              Day {elapsedDays} of {item.duration_days}
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round((elapsedDays / item.duration_days) * 100)}%
            </Text>
          </View>
        </View>
      )}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  daysLeftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  daysLeftText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  eventDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  eventStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  eventStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventStatText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  inviteCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accentMuted,
    letterSpacing: 0.5,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
