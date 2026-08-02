import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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

const DURATIONS = [1, 3, 5, 7, 14];
const TOPICS = ['Dynamic Programming', 'Graph / Trees', 'Arrays & Strings', 'SQL & Databases'];

export default function CreateEventScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(7);
  const [mode, setMode] = useState<EventMode>('standard');
  const [topic, setTopic] = useState('Dynamic Programming');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an event name');
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
        'Event Created! 🎉',
        `Mode: ${mode === 'duel' ? '⚔️ 1v1 Duel' : mode === 'topic_sprint' ? '🏷️ Topic Sprint' : '🏆 Standard'}\nInvite Code: ${event.invite_code}\n\nShare this code with your rival/friends!`,
        [{ text: 'Got it', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create event');
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Challenge</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.marquee}>{'<'}NEW_CHALLENGE{'>'}</Text>
        <Text style={styles.title}>Select Challenge Mode</Text>

        {/* Mode Selector */}
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[styles.modeCard, mode === 'standard' && styles.modeCardActive]}
            onPress={() => { setMode('standard'); setDuration(7); }}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIcon, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="trophy" size={22} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeTitle}>Standard Challenge</Text>
              <Text style={styles.modeSub}>Multi-player 7-day leaderboards</Text>
            </View>
            {mode === 'standard' && <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, mode === 'duel' && styles.modeCardActive]}
            onPress={() => { setMode('duel'); setDuration(1); }}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="flash" size={22} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeTitle}>⚔️ 1v1 Duel Mode</Text>
              <Text style={styles.modeSub}>Fast 24-hr head-to-head battle</Text>
            </View>
            {mode === 'duel' && <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, mode === 'topic_sprint' && styles.modeCardActive]}
            onPress={() => { setMode('topic_sprint'); setDuration(5); }}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="code-working" size={22} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeTitle}>🏷️ Topic Sprint</Text>
              <Text style={styles.modeSub}>Focus on specific algorithms</Text>
            </View>
            {mode === 'topic_sprint' && <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />}
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Event Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="trophy-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={mode === 'duel' ? "1v1 Speed Battle" : mode === 'topic_sprint' ? "DP Mastery Sprint" : "7-Day LeetCode Grind"}
              placeholderTextColor={theme.colors.textTertiary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {mode === 'topic_sprint' && (
            <>
              <Text style={styles.inputLabel}>Select Target Topic</Text>
              <View style={styles.topicGrid}>
                {TOPICS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.topicChip, topic === t && styles.topicChipActive]}
                    onPress={() => setTopic(t)}
                  >
                    <Text style={[styles.topicChipText, topic === t && styles.topicChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {mode !== 'duel' && (
            <>
              <Text style={styles.inputLabel}>Duration (Days)</Text>
              <View style={styles.durationPicker}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.durationPill, duration === d && styles.durationPillActive]}
                    onPress={() => setDuration(d)}
                  >
                    <Text style={[styles.durationPillText, duration === d && styles.durationPillTextActive]}>
                      {d}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.inputLabel}>Description (optional)</Text>
          <View style={[styles.inputContainer, { height: 70, alignItems: 'flex-start', paddingTop: 10 }]}>
            <Ionicons name="document-text-outline" size={18} color={theme.colors.textTertiary} style={[styles.inputIcon, { marginTop: 2 }]} />
            <TextInput
              style={[styles.input, { textAlignVertical: 'top' }]}
              placeholder="Rules or extra challenge notes..."
              placeholderTextColor={theme.colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.textWhite} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Launch Challenge</Text>
              <Ionicons name="rocket-outline" size={20} color={theme.colors.textWhite} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...theme.typography.h3, color: theme.colors.textPrimary },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  marquee: { fontSize: 15, fontWeight: '700', color: theme.colors.accent, marginTop: 12, marginBottom: 4, letterSpacing: 1 },
  title: { ...theme.typography.h1, color: theme.colors.textPrimary, marginBottom: 16 },
  modeContainer: { gap: 10, marginBottom: 20 },
  modeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: theme.colors.borderLight, ...theme.shadows.sm },
  modeCardActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentLight },
  modeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { ...theme.typography.bodyBold, color: theme.colors.textPrimary },
  modeSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  formCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, ...theme.shadows.md, marginBottom: 20 },
  inputLabel: { ...theme.typography.captionBold, color: theme.colors.textPrimary, marginBottom: 8, marginTop: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: theme.colors.borderLight },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: theme.colors.textPrimary },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.borderLight },
  topicChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  topicChipText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  topicChipTextActive: { color: '#fff' },
  durationPicker: { flexDirection: 'row', gap: 8 },
  durationPill: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.borderLight },
  durationPillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  durationPillText: { ...theme.typography.bodyBold, color: theme.colors.textSecondary },
  durationPillTextActive: { color: theme.colors.textWhite },
  submitButton: { backgroundColor: theme.colors.primary, height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...theme.shadows.md },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: theme.colors.textWhite, fontSize: 16, fontWeight: '700' },
});
