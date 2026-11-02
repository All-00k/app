import { Easing } from 'react-native';

/**
 * Standard Animation Tokens & Easing Curves
 * Source: Emil Kowalski Design Engineering & Apple Fluid Interfaces Philosophy
 */

export const motion = {
  // Easing curves
  easeOut: Easing.bezier(0.23, 1, 0.32, 1),       // Strong ease-out for entering UI
  easeInOut: Easing.bezier(0.77, 0, 0.175, 1),    // Strong ease-in-out for morphs
  easeDrawer: Easing.bezier(0.32, 0.72, 0, 1),    // iOS drawer curve

  // Durations (all sub-300ms for UI)
  duration: {
    press: 140,
    quick: 160,
    standard: 220,
    modal: 260,
    staggerStep: 40,
  },

  // Spring physics
  spring: {
    // Critically damped default UI spring (no bounce)
    ui: {
      damping: 24,
      mass: 1,
      stiffness: 220,
    },
    // Under-damped momentum spring (slight bounce on release)
    momentum: {
      damping: 18,
      mass: 1,
      stiffness: 180,
    },
  },

  // Physical entrance transforms (Never scale(0))
  initialScale: 0.96,
  initialTranslateY: 8,
};
