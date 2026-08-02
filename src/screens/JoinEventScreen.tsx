import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { theme } from '../utils/theme';

export default function JoinEventScreen({ navigation }: any) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!code.trim()) { Alert.alert('Error', 'Please enter an invite code'); return; }
    setLoading(true);
    try {
      const result = await api.joinEvent(code.trim());
      Alert.alert('Joined!', `You joined "${result.event.name}"!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to join');
    }
    setLoading(false);
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Join Event</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={s.content}>
        <Text style={s.tag}>{'<'}JOIN{'>'}</Text>
        <Text style={s.title}>Enter invite code</Text>
        <Text style={s.sub}>Get the code from your friend to join their challenge.</Text>
        <View style={s.card}>
          <View style={s.codeBox}>
            <Ionicons name="key-outline" size={20} color={theme.colors.accent} />
            <TextInput style={s.codeInput} placeholder="ABCD1234"
              placeholderTextColor={theme.colors.textTertiary} value={code}
              onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters"
              maxLength={8} textAlign="center" />
          </View>
        </View>
        <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleJoin}
          disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <><Text style={s.btnText}>Join Event</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" /></>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...theme.typography.h3, color: theme.colors.textPrimary },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  tag: { fontSize: 16, fontWeight: '700', color: theme.colors.accent, marginBottom: 8, letterSpacing: 1 },
  title: { ...theme.typography.h1, color: theme.colors.textPrimary, marginBottom: 8 },
  sub: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 22, marginBottom: 32 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, ...theme.shadows.md, marginBottom: 24 },
  codeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceAlt, borderRadius: 16, paddingHorizontal: 16, height: 64, borderWidth: 2, borderColor: theme.colors.accent, gap: 12 },
  codeInput: { flex: 1, fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: 4 },
  btn: { backgroundColor: theme.colors.primary, height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...theme.shadows.md },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
