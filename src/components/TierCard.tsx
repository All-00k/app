import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

interface TierCardProps {
  tier: string;
  badge?: string;
  score: number;
  nextScore: number;
  minScore?: number;
}

export default function TierCard({
  tier,
  score,
  nextScore,
  minScore = 0,
}: TierCardProps) {
  const currentLevelProgress = Math.max(0, score - minScore);
  const totalLevelRange = Math.max(1, nextScore - minScore);
  const progressPercent = Math.min(100, Math.max(0, (currentLevelProgress / totalLevelRange) * 100));

  function getTierIcon(tierName: string): { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
    const lower = (tierName || '').toLowerCase();
    if (lower.includes('grandmaster')) {
      return { icon: 'ribbon', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.16)' };
    }
    if (lower.includes('elite') || lower.includes('architect')) {
      return { icon: 'diamond', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.16)' };
    }
    if (lower.includes('algo') || lower.includes('master')) {
      return { icon: 'trophy', color: theme.colors.gold, bg: 'rgba(217, 119, 6, 0.16)' };
    }
    if (lower.includes('warrior')) {
      return { icon: 'shield-checkmark', color: theme.colors.accent, bg: 'rgba(45, 212, 168, 0.16)' };
    }
    return { icon: 'shield-outline', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.16)' };
  }

  const tierVisual = getTierIcon(tier);

  return (
    <View style={styles.tierCard}>
      <View style={styles.tierHeader}>
        <View style={[styles.tierBadgeBox, { backgroundColor: tierVisual.bg }]}>
          <Ionicons name={tierVisual.icon} size={22} color={tierVisual.color} />
        </View>
        <View style={styles.tierInfo}>
          <View style={styles.tierLabelRow}>
            <Text style={styles.tierCategory}>ARENA TIER STANDING</Text>
            <Text style={styles.tierPercentText}>{Math.round(progressPercent)}%</Text>
          </View>
          <Text style={styles.tierTitle}>{tier || 'Novice Coder'}</Text>
          <Text style={styles.tierSub}>
            {score.toLocaleString()} / {nextScore.toLocaleString()} XP to next rank
          </Text>
        </View>
      </View>

      <View style={styles.tierBarBg}>
        <View style={[styles.tierBarFill, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tierCard: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    ...theme.shadows.md,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tierBadgeBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  tierInfo: {
    flex: 1,
  },
  tierLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierCategory: {
    ...theme.typography.label,
    color: theme.colors.accent,
    fontSize: 9.5,
    letterSpacing: 1,
  },
  tierPercentText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  tierTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textWhite,
    letterSpacing: -0.3,
    marginTop: 1,
  },
  tierSub: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 2,
  },
  tierBarBg: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  tierBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.full,
  },
});
