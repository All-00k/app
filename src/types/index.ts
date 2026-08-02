export interface User {
  id: number;
  username: string;
  email: string;
  leetcode_id: string;
  avatar_url: string;
  total_easy: number;
  total_medium: number;
  total_hard: number;
  total_score: number;
  tier?: string;
  tier_badge?: string;
  tier_color?: string;
  next_score?: number;
  min_score?: number;
  xp?: number;
  last_synced_at?: string;
  created_at?: string;
}

export type EventMode = 'standard' | 'duel' | 'topic_sprint';

export interface Event {
  id: number;
  name: string;
  description: string;
  creator_id: number;
  creator_name?: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  invite_code: string;
  mode: EventMode;
  topic?: string;
  status: 'upcoming' | 'active' | 'completed';
  participant_count?: number;
  created_at?: string;
}

export interface LeaderboardEntry {
  id: number;
  event_id: number;
  user_id: number;
  username: string;
  leetcode_id: string;
  avatar_url: string;
  easy_at_join: number;
  medium_at_join: number;
  hard_at_join: number;
  current_easy: number;
  current_medium: number;
  current_hard: number;
  easy_delta: number;
  medium_delta: number;
  hard_delta: number;
  score: number;
  tier?: string;
  tier_badge?: string;
  tier_color?: string;
  joined_at: string;
}

export interface DailyProgress {
  id: number;
  participant_id: number;
  date: string;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  daily_score: number;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  EventDetail: { eventId: number };
  CreateEvent: undefined;
  JoinEvent: undefined;
};

export type MainTabParamList = {
  Register: undefined;
  Board: undefined;
  Profile: undefined;
};
