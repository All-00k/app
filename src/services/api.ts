import axios from 'axios';
import {
  User,
  Event,
  LeaderboardEntry,
  DailyProgress,
  FriendRequest,
  SearchUserResult,
  FriendsLeaderboardEntry,
  ComparisonData,
} from '../types';

import { Platform } from 'react-native';

// Backend API URL (Localhost when testing locally in browser, Render for Vercel & Mobile)
const PRODUCTION_API_URL = 'https://app-blw0.onrender.com/api';
const HOST_IP = '192.168.0.206';

const isLocalhost =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE = isLocalhost
  ? 'http://localhost:3001/api'
  : (process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL || `http://${HOST_IP}:3001/api`);

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

const api = {
  // ─── Auth ──────────────────────────────────────
  async register(username: string, email: string, password: string, leetcode_id: string) {
    const res = await axios.post(`${API_BASE}/auth/register`, {
      username, email, password, leetcode_id,
    }, { headers: getHeaders() });
    return res.data as { token: string; user: User };
  },

  async login(email: string, password: string) {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email, password,
    }, { headers: getHeaders() });
    return res.data as { token: string; user: User };
  },

  async googleAuth(payload: {
    id_token?: string;
    access_token?: string;
    leetcode_id?: string;
    email?: string;
    name?: string;
    avatar?: string;
  }) {
    const res = await axios.post(`${API_BASE}/auth/google`, payload, { headers: getHeaders() });
    return res.data as {
      token?: string;
      user?: User;
      needsLeetCode?: boolean;
      email?: string;
      name?: string;
      avatar?: string;
    };
  },

  async getProfile() {
    const res = await axios.get(`${API_BASE}/auth/profile`, { headers: getHeaders() });
    return res.data as { user: User };
  },

  // ─── Events ────────────────────────────────────
  async createEvent(name: string, description: string, duration_days: number, mode: string = 'standard', topic?: string, start_date?: string) {
    const res = await axios.post(`${API_BASE}/events`, {
      name, description, duration_days, mode, topic, start_date,
    }, { headers: getHeaders() });
    return res.data as { event: Event };
  },

  async getEvents() {
    const res = await axios.get(`${API_BASE}/events`, { headers: getHeaders() });
    return res.data as { events: Event[] };
  },

  async getEvent(id: number) {
    const res = await axios.get(`${API_BASE}/events/${id}`, { headers: getHeaders() });
    return res.data as { event: Event };
  },

  async joinEvent(invite_code: string) {
    const res = await axios.post(`${API_BASE}/events/join`, {
      invite_code,
    }, { headers: getHeaders() });
    return res.data as { message: string; event: Event };
  },

  async getLeaderboard(eventId: number) {
    const res = await axios.get(`${API_BASE}/events/${eventId}/leaderboard`, { headers: getHeaders() });
    return res.data as { leaderboard: LeaderboardEntry[] };
  },

  async getDailyProgress(eventId: number, userId: number) {
    const res = await axios.get(`${API_BASE}/events/${eventId}/progress/${userId}`, { headers: getHeaders() });
    return res.data as { progress: DailyProgress[] };
  },

  // ─── Sync ──────────────────────────────────────
  async syncUser(userId: number) {
    const res = await axios.post(`${API_BASE}/sync/${userId}`, {}, { headers: getHeaders() });
    return res.data;
  },

  async syncEvent(eventId: number) {
    const res = await axios.post(`${API_BASE}/sync/event/${eventId}`, {}, { headers: getHeaders() });
    return res.data;
  },

  // ─── Rankings ──────────────────────────────────
  async getRankings() {
    const res = await axios.get(`${API_BASE}/rankings`, { headers: getHeaders() });
    return res.data as { rankings: User[] };
  },

  // ─── Friends & Social ──────────────────────────
  async getFriends() {
    const res = await axios.get(`${API_BASE}/friends`, { headers: getHeaders() });
    return res.data as { friends: User[] };
  },

  async getFriendsLeaderboard() {
    const res = await axios.get(`${API_BASE}/friends/leaderboard`, { headers: getHeaders() });
    return res.data as { leaderboard: FriendsLeaderboardEntry[]; userRank: number; totalFriends: number };
  },

  async getFriendRequests() {
    const res = await axios.get(`${API_BASE}/friends/requests`, { headers: getHeaders() });
    return res.data as { incoming: FriendRequest[]; outgoing: FriendRequest[] };
  },

  async searchUsers(query: string) {
    const res = await axios.get(`${API_BASE}/friends/search?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
    return res.data as { users: SearchUserResult[] };
  },

  async sendFriendRequest(targetUserId?: number, identifier?: string) {
    const res = await axios.post(`${API_BASE}/friends/request`, {
      target_user_id: targetUserId,
      identifier,
    }, { headers: getHeaders() });
    return res.data as { message: string; status: string };
  },

  async acceptFriendRequest(friendshipId?: number, friendUserId?: number) {
    const res = await axios.post(`${API_BASE}/friends/accept`, {
      friendship_id: friendshipId,
      friend_user_id: friendUserId,
    }, { headers: getHeaders() });
    return res.data as { message: string; status: string };
  },

  async rejectFriendRequest(friendshipId?: number, friendUserId?: number) {
    const res = await axios.post(`${API_BASE}/friends/reject`, {
      friendship_id: friendshipId,
      friend_user_id: friendUserId,
    }, { headers: getHeaders() });
    return res.data as { message: string; status: string };
  },

  async removeFriend(friendId: number) {
    const res = await axios.delete(`${API_BASE}/friends/${friendId}`, { headers: getHeaders() });
    return res.data as { message: string };
  },

  async getComparison(friendId: number) {
    const res = await axios.get(`${API_BASE}/friends/compare/${friendId}`, { headers: getHeaders() });
    return res.data as ComparisonData;
  },

  // ─── Multi-Platform & DPI ─────────────────────
  async getLinkedPlatforms() {
    const res = await axios.get(`${API_BASE}/platforms`, { headers: getHeaders() });
    return res.data as {
      success: boolean;
      platforms: Record<string, {
        platform: string;
        name: string;
        handle: string;
        linked: boolean;
        icon: string;
        color: string;
        stats?: any;
      }>;
      dpi: {
        dpiScore: number;
        dpiTier: string;
        dpiBadge: string;
        dpiColor: string;
        breakdown: {
          leetcodeScore: number;
          codeforcesScore: number;
          codechefScore: number;
          gfgScore: number;
          hackerrankScore: number;
        };
      };
    };
  },

  async linkPlatform(platform: string, handle: string) {
    const res = await axios.post(`${API_BASE}/platforms/link`, {
      platform,
      handle,
    }, { headers: getHeaders() });
    return res.data;
  },

  async syncPlatforms(platform?: string) {
    const res = await axios.post(`${API_BASE}/platforms/sync`, { platform }, { headers: getHeaders() });
    return res.data;
  },

  async unlinkPlatform(platform: string) {
    const res = await axios.delete(`${API_BASE}/platforms/${platform}`, { headers: getHeaders() });
    return res.data;
  },

  async getDPILeaderboard() {
    const res = await axios.get(`${API_BASE}/platforms/leaderboard`, { headers: getHeaders() });
    return res.data as { success: boolean; leaderboard: any[]; totalParticipants: number };
  },

  // ─── Notifications ─────────────────────────────
  async getNotifications() {
    const res = await axios.get(`${API_BASE}/notifications`, { headers: getHeaders() });
    return res.data as { notifications: any[] };
  },

  async registerPushToken(push_token: string) {
    const res = await axios.post(`${API_BASE}/notifications/push-token`, { push_token }, { headers: getHeaders() });
    return res.data;
  },
};

export default api;
