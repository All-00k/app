import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, Alert, ActivityIndicator, Platform, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Event, LeaderboardEntry } from '../types';
import { theme } from '../utils/theme';
import { useFocusEffect } from '@react-navigation/native';

export default function EventDetailScreen({ route, navigation }: any) {
  const { eventId } = route.params;
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    try {
      const [ev, lb, notifs] = await Promise.all([
        api.getEvent(eventId),
        api.getLeaderboard(eventId),
        api.getNotifications(),
      ]);
      setEvent(ev.event);
      setLeaderboard(lb.leaderboard);
      setNotifications(notifs.notifications.filter((n: any) => n.event_id === eventId));
    } catch {}
  }

  async function onRefresh() { setRefreshing(true); await loadData(); setRefreshing(false); }

  async function handleSync() {
    setSyncing(true);
    try {
      await api.syncEvent(eventId);
      await loadData();
      Alert.alert('Synced! 🔔', 'Leaderboard & Live Notifications updated with latest solves.');
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.error || 'Sync failed'); }
    setSyncing(false);
  }

  async function handleShare() {
    if (!event) return;
    try {
      await Share.share({ message: `Join my CodeArena event "${event.name}"!\nInvite code: ${event.invite_code}` });
    } catch {}
  }

  function getDaysLeft() {
    if (!event) return 0;
    const diff = new Date(event.end_date).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }

  function getProgress() {
    if (!event) return 0;
    const daysLeft = getDaysLeft();
    return Math.min(100, ((event.duration_days - daysLeft) / event.duration_days) * 100);
  }

  if (!event) return (
    <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
    </View>
  );

  const daysLeft = getDaysLeft();
  const userRank = leaderboard.findIndex(e => e.user_id === user?.id) + 1;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{event.name}</Text>
        <TouchableOpacity onPress={handleShare} style={s.back}>
          <Ionicons name="share-outline" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}>

        {/* Status Card */}
        <View style={s.statusCard}>
          <View style={s.statusRow}>
            <View>
              <Text style={s.statusLabel}>EVENT STATUS</Text>
              <Text style={s.statusValue}>{event.status.toUpperCase()}</Text>
            </View>
            <View style={s.statusIcon}>
              <Ionicons name={event.status === 'active' ? 'pulse' : event.status === 'upcoming' ? 'time' : 'checkmark-done'} size={24} color={theme.colors.accent} />
            </View>
          </View>
          <View style={s.statusStats}>
            <View style={s.statusStat}>
              <Text style={s.statNum}>{leaderboard.length}</Text>
              <Text style={s.statLbl}>Players</Text>
            </View>
            <View style={s.statusStat}>
              <Text style={s.statNum}>{daysLeft}</Text>
              <Text style={s.statLbl}>Days Left</Text>
            </View>
            <View style={s.statusStat}>
              <Text style={s.statNum}>#{userRank || '—'}</Text>
              <Text style={s.statLbl}>Your Rank</Text>
            </View>
          </View>
          <View style={s.progressBarBg}>
            <View style={[s.progressFill, { width: `${getProgress()}%` }]} />
          </View>
          <Text style={s.progressTxt}>Day {event.duration_days - daysLeft} of {event.duration_days}</Text>
        </View>

        {/* Invite Code */}
        <View style={s.inviteCard}>
          <Ionicons name="key" size={18} color={theme.colors.accent} />
          <Text style={s.inviteLabel}>Invite Code:</Text>
          <Text style={s.inviteCode}>{event.invite_code}</Text>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="copy-outline" size={18} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Sync Button */}
        <TouchableOpacity style={s.syncBtn} onPress={handleSync} disabled={syncing} activeOpacity={0.8}>
          {syncing ? <ActivityIndicator color="#fff" size="small" /> : (
            <><Ionicons name="sync" size={16} color="#fff" /><Text style={s.syncTxt}>Sync & Trigger Push Alerts</Text></>
          )}
        </TouchableOpacity>

        {/* Live Solve Push Notifications Feed */}
        {notifications.length > 0 && (
          <View style={s.notifSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Ionicons name="notifications" size={18} color={theme.colors.accent} />
              <Text style={s.notifTitle}>Live Activity Push Feed</Text>
            </View>
            {notifications.slice(0, 3).map((n) => (
              <View key={n.id} style={s.notifCard}>
                <View style={s.notifDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.notifText}>{n.message}</Text>
                  <Text style={s.notifTime}>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Leaderboard */}
        <Text style={s.sectionTitle}>Leaderboard</Text>

        {leaderboard.map((entry, idx) => {
          const rank = idx + 1;
          const isUser = entry.user_id === user?.id;
          return (
            <View key={entry.id} style={[s.row, isUser && s.rowHighlight]}>
              <Text style={[s.rowRank, rank <= 3 && { color: theme.colors.accent, fontWeight: '800' }]}>
                {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
              </Text>
              <View style={[s.rowAvatar, isUser && { backgroundColor: theme.colors.accentLight }]}>
                <Ionicons name="person" size={16} color={isUser ? theme.colors.accent : theme.colors.textSecondary} />
              </View>
              <View style={s.rowInfo}>
                <Text style={[s.rowName, isUser && { color: theme.colors.accent }]}>{entry.username}{isUser ? ' (You)' : ''}</Text>
                <Text style={s.rowSub}>E:{entry.easy_delta} M:{entry.medium_delta} H:{entry.hard_delta}</Text>
              </View>
              <View style={s.rowScoreCol}>
                <Text style={[s.rowScore, isUser && { color: theme.colors.accent }]}>{entry.score}</Text>
                <Text style={s.rowPts}>pts</Text>
              </View>
            </View>
          );
        })}

        {leaderboard.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={40} color={theme.colors.textTertiary} />
            <Text style={s.emptyTxt}>No participants yet. Share the invite code!</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...theme.typography.h3, color: theme.colors.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  statusCard: { margin: 20, backgroundColor: theme.colors.primary, borderRadius: 20, padding: 20, ...theme.shadows.lg },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusLabel: { ...theme.typography.label, color: theme.colors.accent, marginBottom: 4 },
  statusValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statusIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(45,212,168,0.15)', alignItems: 'center', justifyContent: 'center' },
  statusStats: { flexDirection: 'row', marginTop: 16, gap: 20 },
  statusStat: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: theme.colors.accent },
  statLbl: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  progressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: 2 },
  progressTxt: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6, textAlign: 'right' },
  inviteCard: { marginHorizontal: 20, backgroundColor: theme.colors.accentLight, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  inviteLabel: { ...theme.typography.captionBold, color: theme.colors.primaryLight },
  inviteCode: { fontSize: 18, fontWeight: '800', color: theme.colors.primary, letterSpacing: 2, flex: 1 },
  syncBtn: { marginHorizontal: 20, backgroundColor: theme.colors.primary, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  syncTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  notifSection: { marginHorizontal: 20, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.borderLight },
  notifTitle: { ...theme.typography.bodyBold, color: theme.colors.textPrimary },
  notifCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent },
  notifText: { fontSize: 13, color: theme.colors.textPrimary, fontWeight: '600' },
  notifTime: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 2 },
  sectionTitle: { ...theme.typography.h3, color: theme.colors.textPrimary, paddingHorizontal: 20, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, ...theme.shadows.sm },
  rowHighlight: { backgroundColor: theme.colors.accentLight, borderWidth: 1.5, borderColor: theme.colors.accent },
  rowRank: { width: 28, fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary, textAlign: 'center' },
  rowAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowInfo: { flex: 1 },
  rowName: { ...theme.typography.bodyBold, color: theme.colors.textPrimary },
  rowSub: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  rowScoreCol: { alignItems: 'flex-end' },
  rowScore: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  rowPts: { fontSize: 10, color: theme.colors.textTertiary },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyTxt: { ...theme.typography.body, color: theme.colors.textTertiary, marginTop: 12 },
});
