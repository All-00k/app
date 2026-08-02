// ─── Stitch-Inspired Design Theme ──────────────────────────────
// Clean, minimal light theme with dark teal accents

export const theme = {
  colors: {
    // Primary palette (from Stitch UI)
    primary: '#0D3B39',        // Dark teal
    primaryLight: '#1A5C58',   // Lighter teal
    accent: '#2DD4A8',         // Mint/teal accent
    accentLight: '#E8FBF5',    // Very light mint

    // Backgrounds
    background: '#F7F8FA',     // Light gray bg
    surface: '#FFFFFF',        // White cards
    surfaceAlt: '#F0F2F5',     // Alt surface

    // Text
    textPrimary: '#1A1A1A',    // Near black
    textSecondary: '#6B7280',  // Medium gray
    textTertiary: '#9CA3AF',   // Light gray
    textWhite: '#FFFFFF',

    // Status
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Difficulty colors
    easy: '#10B981',
    medium: '#F59E0B',
    hard: '#EF4444',

    // Borders
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // Shadows
    shadow: 'rgba(0, 0, 0, 0.06)',
    shadowDark: 'rgba(0, 0, 0, 0.12)',

    // Rank
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',

    // Tab bar
    tabActive: '#0D3B39',
    tabInactive: '#9CA3AF',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },

  typography: {
    h1: {
      fontSize: 28,
      fontWeight: '800' as const,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 22,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
    },
    bodyBold: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    caption: {
      fontSize: 13,
      fontWeight: '400' as const,
    },
    captionBold: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    label: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    stat: {
      fontSize: 32,
      fontWeight: '800' as const,
      letterSpacing: -1,
    },
    rank: {
      fontSize: 42,
      fontWeight: '900' as const,
      letterSpacing: -1.5,
    },
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;
