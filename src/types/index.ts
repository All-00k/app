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
  color?: string;
  next_score?: number;
  min_score?: number;
  xp?: number;
  contest_rating?: number;
  contest_rank?: number;
  contest_badge?: string;
  ranking?: number;
  codeforces_id?: string;
  codechef_id?: string;
  gfg_id?: string;
  hackerrank_id?: string;
  dpi_score?: number;
  dpi_tier?: string;
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

// ─── Friend & Social Types ──────────────────────────────────────

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export interface SearchUserResult extends User {
  friendship_status: FriendshipStatus;
  friendship_id?: number | null;
}

export interface FriendRequest {
  friendship_id: number;
  user: User;
  created_at: string;
}

export interface FriendsLeaderboardEntry extends User {
  rank: number;
  isCurrentUser: boolean;
}

export interface TopicComparison {
  id: string;
  name: string;
  icon: string;
  userSolved: number;
  friendSolved: number;
  delta: number;
  winner: 'user' | 'friend' | 'tie';
}

export interface AICoachStrategy {
  status: 'ahead' | 'behind' | 'tied';
  leadScore: number;
  summary: string;
  recommendedFocus: string[];
  actionSteps: string[];
  fastestOvertakePlan: string;
  userStrengths: string[];
  friendStrengths: string[];
}

// ─── Multi-Platform & DPI Types ─────────────────────────────────

export type PlatformKey = 'leetcode' | 'codeforces' | 'codechef' | 'gfg' | 'hackerrank';

export interface PlatformInfo {
  platform: PlatformKey;
  name: string;
  handle: string;
  linked: boolean;
  icon: string;
  color: string;
  stats?: any;
}

export interface DPIBreakdown {
  leetcodeScore: number;
  codeforcesScore: number;
  codechefScore: number;
  gfgScore: number;
  hackerrankScore: number;
}

export interface DPIProfile {
  dpiScore: number;
  dpiTier: string;
  dpiBadge: string;
  dpiColor: string;
  breakdown: DPIBreakdown;
}

export interface DPILeaderboardEntry {
  rank: number;
  id: number;
  username: string;
  avatar_url?: string;
  leetcode_id: string;
  dpi_score: number;
  dpi_tier: string;
  dpi_badge: string;
  dpi_color: string;
  active_platforms: string[];
  breakdown: DPIBreakdown;
}

export interface MultiPlatformItem {
  id: PlatformKey;
  name: string;
  icon: string;
  color: string;
  userScore: number;
  friendScore: number;
  userMetric: string;
  friendMetric: string;
  userLinked: boolean;
  friendLinked: boolean;
  delta: number;
  winner: 'user' | 'friend' | 'tie';
}

export interface MultiPlatformComparison {
  userDpi: DPIProfile;
  friendDpi: DPIProfile;
  dpiDelta: number;
  userWins: number;
  friendWins: number;
  platforms: MultiPlatformItem[];
}

export interface ComparisonData {
  user: User & { total_solved?: number };
  friend: User & { total_solved?: number };
  scoreDelta: number;
  ratingDelta: number;
  leadingUser: 'user' | 'friend' | 'tied';
  difficultyComparison: {
    easy: { user: number; friend: number; delta: number; winner: 'user' | 'friend' | 'tie' };
    medium: { user: number; friend: number; delta: number; winner: 'user' | 'friend' | 'tie' };
    hard: { user: number; friend: number; delta: number; winner: 'user' | 'friend' | 'tie' };
    total: { user: number; friend: number; delta: number; winner: 'user' | 'friend' | 'tie' };
  };
  topicComparison: TopicComparison[];
  multiPlatform?: MultiPlatformComparison;
  aiCoach: AICoachStrategy;
}

// ─── Navigation Types ──────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  EventDetail: { eventId: number };
  CreateEvent: { mode?: string; friendId?: number; friendUsername?: string } | undefined;
  JoinEvent: undefined;
  Compare: { friendId: number; friendUsername?: string; friendLeetcodeId?: string };
};

export type MainTabParamList = {
  Register: undefined;
  Board: undefined;
  Friends: undefined;
  Profile: undefined;
};
