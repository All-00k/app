import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgePillProps {
  label: string;
  bgColor?: string;
  textColor?: string;
  icon?: string;
}

export default function BadgePill({ label, bgColor = '#E0F2FE', textColor = '#0284C7', icon }: BadgePillProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  icon: {
    fontSize: 11,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
