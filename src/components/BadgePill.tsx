import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

interface BadgePillProps {
  label: string;
  bgColor?: string;
  textColor?: string;
  color?: string;
  badge?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md';
}

export default function BadgePill({
  label,
  bgColor,
  textColor,
  color,
  badge,
  iconName,
  size = 'md',
}: BadgePillProps) {
  const isSm = size === 'sm';
  const effectiveBg = bgColor || (color ? color + '22' : theme.colors.accentLight);
  const effectiveText = textColor || color || theme.colors.primary;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: effectiveBg },
        isSm && styles.badgeSm,
      ]}
    >
      {iconName ? (
        <Ionicons
          name={iconName}
          size={isSm ? 10 : 12}
          color={effectiveText}
          style={styles.icon}
        />
      ) : null}
      <Text
        style={[
          styles.text,
          { color: effectiveText },
          isSm && styles.textSm,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 3,
  },
  icon: {
    marginRight: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 10,
    fontWeight: '700',
  },
});
