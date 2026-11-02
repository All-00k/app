import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { theme } from '../utils/theme';
import { EventMode } from '../types';
import ScalePressable from '../components/ScalePressable';

const DURATIONS = [1, 3, 5, 7, 14];
const TOPICS = ['Dynamic Programming', 'Graphs & Trees', 'Arrays & Strings', 'SQL & Databases'];

export default function CreateEventScreen({ navigation, route }: any) {
  const initialMode = (route?.params?.mode as EventMode) || 'standard';
  const friendUsername = route?.params?.friendUsername;

  const [name, setName] = useState(
    initialMode === 'duel' && friendUsername
      ? `1v1 Duel vs @${friendUsername}`
      : ''
  );
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(initialMode === 'duel' ? 1 : 7);
  const [mode, setMode] = useState<EventMode>(initialMode);
  const [topic, setTopic] = useState('Dynamic Programming');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a challenge name');
      return;
    }

    setLoading(true);
    try {
      const selectedDuration = mode === 'duel' ? 1 : duration;
      const { event } = await api.createEvent(
        name.trim(),
        description.trim(),
        selectedDuration,
        mode,
        mode === 'topic_sprint' ? topic : undefined
      );
      Alert.alert(
        'Challenge Created',
        `Mode: ${mode === 'duel' ? '1v1 Duel' : mode === 'topic_sprint' ? `Topic Sprint (${topic})` : 'Standard Arena'}\nInvite Code: ${event.invite_code}\n\nShare this code with your rivals to begin!`,
        [{ text: 'View Arena', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Creation Failed', err?.response?.data?.error || 'Failed to create challenge');
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
        <Text style={styles.headerTitle}>New Challenge</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.marquee}>{'<'}CONFIG_ARENA{'>'}</Text>
        <Text style={styles.title}>Select Arena Mode</Text>

        {/* Mode Selector Bento */}
        <View style={styles.modeContainer}>
          <ScalePressable
            style={[styles.modeCard, mode === 'standard' && styles.modeCardActive]}
            onPress={() => {
              setMode('standard');
              setDuration(7);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'standard' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' }}>
              <View style={[styles.modeIcon, { backgroundColor: theme.colors.accentLight }]}>
                <Ionicons name="trophy-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeTitle}>Standard Arena</Text>
                <Text style={styles.modeSub}>Multi-player 7-day leaderboards with score deltas</Text>
              </View>
              {mode === 'standard' ? (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              ) : (
                <View style={styles.radioEmpty} />
              )}
            </View>
          </ScalePressable>

          <ScalePressable
            style={[styles.modeCard, mode === 'duel' && styles.modeCardActive]}
            onPress={() => {
              setMode('duel');
              setDuration(1);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'duel' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' }}>
              <View style={[styles.modeIcon, { backgroundColor: theme.colors.errorLight }]}>
                <Ionicons name="flash-outline" size={20} color={theme.colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeTitle}>1v1 Duel Mode</Text>
                <Text style={styles.modeSub}>High-intensity 24-hour head-to-head showdown</Text>
              </View>
              {mode === 'duel' ? (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              ) : (
                <View style={styles.radioEmpty} />
              )}
            </View>
          </ScalePressable>

          <ScalePressable
            style={[styles.modeCard, mode === 'topic_sprint' && styles.modeCardActive]}
            onPress={() => {
              setMode('topic_sprint');
              setDuration(5);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'topic_sprint' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' }}>
              <View style={[styles.modeIcon, { backgroundColor: theme.colors.goldLight }]}>
                <Ionicons name="layers-outline" size={20} color={theme.colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeTitle}>Topic Sprint</Text>
                <Text style={styles.modeSub}>Targeted algorithmic category sprint</Text>
              </View>
              {mode === 'topic_sprint' ? (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              ) : (
                <View style={styles.radioEmpty} />
              )}
            </View>
          </ScalePressable>
        </View>

        {/* Challenge Details Form */}
        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Challenge Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="flag-outline"
              size={16}
              color={theme.colors.textTertiary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder={
                mode === 'duel'
                  ? 'Speed Duel #1'
                  : mode === 'topic_sprint'
                  ? 'DP Mastery Sprint'
                  : 'Weekly LeetCode Sprint'
              }
              placeholderTextColor={theme.colors.textTertiary}
              value={name}
              onChangeText={setName}
              accessibilityLabel="Challenge Name input"
            />
          </View>

          {mode === 'topic_sprint' && (
            <>
              <Text style={styles.inputLabel}>Select Focus Topic</Text>
              <View style={styles.topicGrid}>
                {TOPICS.map((t) => (
                  <ScalePressable
                    key={t}
                    style={[styles.topicChip, topic === t && styles.topicChipActive]}
                    onPress={() => setTopic(t)}
                    accessibilityRole="button"
                    accessibilityLabel={`Topic ${t}`}
                  >
                    <Text
                      style={[
                        styles.topicChipText,
                        topic === t && styles.topicChipTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </ScalePressable>
                ))}
              </View>
            </>
          )}

          {mode !== 'duel' && (
            <>
              <Text style={styles.inputLabel}>Duration</Text>
              <View style={styles.durationPicker}>
                {DURATIONS.map((d) => (
                  <ScalePressable
                    key={d}
                    style={[
                      styles.durationPill,
                      duration === d && styles.durationPillActive,
                    ]}
                    onPress={() => setDuration(d)}
                    accessibilityRole="button"
                    accessibilityLabel={`Duration ${d} Days`}
                  >
                    <Text
                      style={[
                        styles.durationPillText,
                        duration === d && styles.durationPillTextActive,
                      ]}
                    >
                      {d} Days
                    </Text>
                  </ScalePressable>
                ))}
              </View>
            </>
          )}

          <Text style={styles.inputLabel}>Description (Optional)</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Rules, goal targets, or extra challenge notes..."
              placeholderTextColor={theme.colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              accessibilityLabel="Description input"
            />
          </View>
        </View>

        {/* Submit */}
        <ScalePressable
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Launch Challenge"
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.textWhite} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.submitButtonText}>Launch Challenge</Text>
              <Ionicons name="arrow-forward" size={18} color={theme.colors.textWhite} />
            </View>
          )}
        </ScalePressable>
      </ScrollView>
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
    paddingBottom: 40,
  },
  marquee: {
    ...theme.typography.monoTag,
    color: theme.colors.accentMuted,
    marginTop: 16,
    marginBottom: 2,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  modeContainer: {
    gap: 8,
    marginBottom: 18,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 64,
    ...theme.shadows.sm,
  },
  modeCardActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentLight,
  },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modeSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  radioEmpty: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
    marginBottom: 20,
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  textAreaContainer: {
    height: 76,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  textArea: {
    textAlignVertical: 'top',
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    minHeight: 34,
    justifyContent: 'center',
  },
  topicChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  topicChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  topicChipTextActive: {
    color: theme.colors.textWhite,
  },
  durationPicker: {
    flexDirection: 'row',
    gap: 6,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    minHeight: 36,
  },
  durationPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  durationPillTextActive: {
    color: theme.colors.textWhite,
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
