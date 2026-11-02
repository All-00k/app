import React, { useRef } from 'react';
import {
  Pressable,
  Animated,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  Easing,
} from 'react-native';

interface ScalePressableProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  disabled?: boolean;
  accessibilityRole?: any;
  accessibilityLabel?: string;
  accessibilityState?: any;
  testID?: string;
}

// Strong ease-out from the animation skill: cubic-bezier(0.23, 1, 0.32, 1)
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export default function ScalePressable({
  children,
  onPress,
  style,
  activeScale = 0.97,
  disabled = false,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
  testID,
}: ScalePressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    if (disabled) return;
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: activeScale,
        duration: 120,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.88,
        duration: 120,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function handlePressOut() {
    if (disabled) return;
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 140,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 140,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
    ]).start();
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      testID={testID}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.6 : opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
