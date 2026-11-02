import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { theme } from '../utils/theme';
import ScalePressable from '../components/ScalePressable';

export default function JoinEventScreen({ navigation }: any) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!code.trim()) {
      Alert.alert('Required Field', 'Please enter a valid challenge invite code');
      return;
    }
    setLoading(true);
    try {
      const result = await api.joinEvent(code.trim());
      Alert.alert('Challenge Joined', `You have entered "${result.event.name}".`, [
        { text: 'Go to Arena', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Join Failed', err?.response?.data?.error || 'Failed to join challenge');
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ScalePressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </ScalePressable>
        <Text style={styles.headerTitle}>Join Challenge</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.monoTag}>{'<'}JOIN_ARENA{'>'}</Text>
        <Text style={styles.title}>Enter Invite Token</Text>
        <Text style={styles.sub}>
          Input the 8-character unique invite code provided by your peers or challenge organizer.
        </Text>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>INVITE CODE</Text>
          <View style={styles.codeBox}>
            <Ionicons name="key-outline" size={18} color={theme.colors.accentMuted} />
            <TextInput
              style={styles.codeInput}
              placeholder="ABCD1234"
              placeholderTextColor={theme.colors.textTertiary}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
              textAlign="center"
              autoFocus
              accessibilityLabel="Invite code 8 character token"
            />
          </View>
        </View>

        <ScalePressable
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleJoin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Enter Challenge"
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.textWhite} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.submitButtonText}>Enter Challenge</Text>
              <Ionicons name="arrow-forward" size={18} color={theme.colors.textWhite} />
            </View>
          )}
        </ScalePressable>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  monoTag: {
    ...theme.typography.monoTag,
    color: theme.colors.accentMuted,
    marginBottom: 4,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  sub: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
    marginBottom: 20,
  },
  inputLabel: {
    ...theme.typography.label,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 14,
    height: 56,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    gap: 10,
  },
  codeInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 3,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    height: 50,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: theme.colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
});
