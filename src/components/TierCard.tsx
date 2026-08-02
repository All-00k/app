import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

interface TierCardProps {
  tier: string;
  badge: string;
  score: number;
  nextScore: number;
  minScore?: number;
}

export default function TierCard({ tier, badge, score, nextScore, minScore = 0 }: TierCardProps) {
  const progress = Math.min(100, Math.max(0, ((score - minScore) / Math.max(1, nextScore - minScore)) * 100));

  return (
    <View style={styles.tierCard}>
      <View style={styles.tierHeader}>
        <View style={styles.tierBadgeBox}>
          <Text style={{ fontSize: 26 }}>{badge}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tierTitle}>{tier}</Text>
          <Text style={styles.tierSub}>{score} / {nextScore} XP to next rank</Text>
        </View>
      </View>
      <View style={styles.tierBarBg}>
        <View style={[styles.tierBarFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tierCard: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    ...theme.shadows.md,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  tierBadgeBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  tierSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  tierBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tierBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
  },
});
