import axios from 'axios';
import { User, Event, LeaderboardEntry, DailyProgress } from '../types';

import { Platform } from 'react-native';

// Production Render Backend API URL (accessible globally on Web & Mobile APKs)
const PRODUCTION_API_URL = 'https://app-blw0.onrender.com/api';
const HOST_IP = '192.168.0.206';

const API_BASE = PRODUCTION_API_URL || (Platform.OS === 'web' ? 'http://localhost:3001/api' : `http://${HOST_IP}:3001/api`);

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
