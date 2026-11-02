// ─── CodeArena Impeccable Design System ──────────────────────────────
// Precision engineered dark-teal/mineral design system with kinpaku gold & patina accents

export const theme = {
  colors: {
    // Primary Brand Anchors (Neo-Kinpaku / Mineral Teal Palette)
    primary: '#0B3330',        // Deep lacquer teal
    primaryLight: '#114B47',   // Rich mineral teal
    primaryDark: '#061F1D',    // Deepest lacquer base
    
    // Accents
    accent: '#2DD4A8',         // Verdigris patina mint (< 80% sat)
    accentLight: '#E6F7F2',    // Subtle patina tint
    accentMuted: '#126E59',    // High-contrast patina text
    
    gold: '#D97706',           // Kinpaku gold
    goldLight: '#FEF3C7',      // Pale gold tint
    goldMuted: '#92400E',      // High-contrast gold text
    
    silver: '#64748B',         // Graphite silver
    silverLight: '#F1F5F9',
    
    bronze: '#B45309',         // Deep bronze
    bronzeLight: '#FFEDD5',

    // Surfaces & Canvas (Clean Neutral Paper / Mineral Slate)
    background: '#F8FAFC',     // Clean slate canvas
    surface: '#FFFFFF',        // Pure white card
    surfaceAlt: '#F1F5F9',     // Subtle graphite tint
    surfaceHighlight: '#E2E8F0',
    surfaceDark: '#0F172A',    // Raised dark panel
    
    // Text Hierarchy
    textPrimary: '#0F172A',    // Deep champagne/charcoal
    textSecondary: '#64748B',  // Muted body slate
    textTertiary: '#94A3B8',   // Subdued metadata
    textWhite: '#FFFFFF',
    textDarkInk: '#061F1D',    // Foreground on gold

    // State Semantics
    success: '#059669',        // Verdigris success
    successLight: '#EDF3EC',
    warning: '#D97706',        // Amber warning
    warningLight: '#FBF3DB',
    error: '#DC2626',          // Crimson error
    errorLight: '#FDEBEC',
    info: '#2563EB',           // Cobalt info
    infoLight: '#E1F3FE',

    // Difficulties
    easy: '#059669',
    easyLight: '#EDF3EC',
    medium: '#D97706',
    mediumLight: '#FBF3DB',
    hard: '#DC2626',
    hardLight: '#FDEBEC',

    // Hairline Structural Borders (1px rule)
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderFocus: '#2DD4A8',
    borderDark: 'rgba(255, 255, 255, 0.12)',

    // Tab Bar
    tabActive: '#0B3330',
    tabInactive: '#94A3B8',
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
    xs: 4,
    sm: 8,
    md: 12,
    lg: 14,
    xl: 16,
    xxl: 20,
    full: 9999,
  },

  fonts: {
    main: 'System',
    heading: 'System',
    body: 'System',
  },

  typography: {
    h1: {
      fontSize: 26,
      fontWeight: '800' as const,
      letterSpacing: -0.5,
      lineHeight: 32,
    },
    h2: {
      fontSize: 20,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
      lineHeight: 26,
    },
    h3: {
      fontSize: 16,
      fontWeight: '700' as const,
      letterSpacing: -0.2,
      lineHeight: 22,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    bodyBold: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    captionBold: {
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
    },
    label: {
      fontSize: 10.5,
      fontWeight: '700' as const,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
    monoTag: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 1.2,
    },
    stat: {
      fontSize: 28,
      fontWeight: '800' as const,
      letterSpacing: -0.8,
    },
    rank: {
      fontSize: 36,
      fontWeight: '900' as const,
      letterSpacing: -1,
    },
  },

  shadows: {
    sm: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    lg: {
      shadowColor: '#0B3330',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
      elevation: 6,
    },
  },
};

export type Theme = typeof theme;

