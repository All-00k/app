import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';
import { theme } from '../utils/theme';
import { motion } from '../utils/motion';
import ScalePressable from '../components/ScalePressable';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const { login, register, loginWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Google Auth state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleNeedsLeetCode, setGoogleNeedsLeetCode] = useState(false);
  const [googlePendingData, setGooglePendingData] = useState<{
    id_token?: string;
    access_token?: string;
    email?: string;
    name?: string;
    avatar?: string;
  } | null>(null);
  const [googleLeetcodeId, setGoogleLeetcodeId] = useState('');

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [leetcodeId, setLeetcodeId] = useState('');

  // Mode switch animations (Scale from 0.96 to 1 + Opacity 0 to 1)
  const formOpacity = useRef(new Animated.Value(1)).current;
  const formScale = useRef(new Animated.Value(1)).current;

  // Google OAuth Hook with prompt=select_account to show Google's account selection page
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'codearena-web.apps.googleusercontent.com',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    extraParams: {
      prompt: 'select_account',
    },
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      (async () => {
        let email = '';
        let name = '';
        let avatar = '';

        if (authentication?.accessToken) {
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${authentication.accessToken}` },
            });
            const data = await userRes.json();
            email = data.email || '';
            name = data.name || '';
            avatar = data.picture || '';
          } catch {}
        }

        processGoogleAuth({
          id_token: authentication?.idToken,
          access_token: authentication?.accessToken,
          email,
          name,
          avatar,
        });
      })();
    } else if (response?.type === 'error') {
      Alert.alert('Google Sign-In Error', response.error?.message || 'Authentication was interrupted.');
      setGoogleLoading(false);
    }
  }, [response]);

  async function processGoogleAuth(params: {
    id_token?: string;
    access_token?: string;
    email?: string;
    name?: string;
    avatar?: string;
  }) {
    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle(params);
      if (res?.needsLeetCode) {
        setGooglePendingData({
          ...params,
          email: res.email,
          name: res.name,
          avatar: res.avatar,
        });
        setGoogleNeedsLeetCode(true);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Google authentication failed';
      Alert.alert('Google Sign-In Failed', msg);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGooglePress() {
    if (loading || googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await promptAsync();
      if (result?.type !== 'success') {
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setGoogleLoading(false);
      Alert.alert('Google Sign-In', err?.message || 'Could not launch Google account selector');
    }
  }

  async function handleCompleteGoogleRegistration() {
    if (!googleLeetcodeId.trim()) {
      Alert.alert('LeetCode ID Required', 'Please enter your LeetCode username handle');
      return;
    }

    setGoogleLoading(true);
    try {
      await loginWithGoogle({
        ...googlePendingData,
        leetcode_id: googleLeetcodeId.trim(),
      });
      setGoogleNeedsLeetCode(false);
      setGooglePendingData(null);
      setGoogleLeetcodeId('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Registration failed';
      Alert.alert('Registration Error', msg);
    } finally {
      setGoogleLoading(false);
    }
  }

  function getPasswordStrength(): { label: string; color: string; width: number } {
    if (password.length === 0) return { label: '', color: theme.colors.border, width: 0 };
    if (password.length < 6) return { label: 'Weak', color: theme.colors.error, width: 0.25 };
    if (password.length < 8) return { label: 'Fair', color: theme.colors.warning, width: 0.5 };
    if (password.length < 12) return { label: 'Good', color: theme.colors.accentMuted, width: 0.75 };
    return { label: 'Strong', color: theme.colors.success, width: 1 };
  }

  async function handleSubmit() {
    if (loading) return;

    if (!email || !password) {
      Alert.alert('Required Fields', 'Please enter your email and password');
      return;
    }

    if (!isLogin && (!fullName || !leetcodeId)) {
      Alert.alert('Required Fields', 'Please fill in all registration fields');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(fullName, email, password, leetcodeId);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Authentication failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    Animated.parallel([
      Animated.timing(formOpacity, { toValue: 0, duration: 90, easing: motion.easeOut, useNativeDriver: true }),
      Animated.timing(formScale, { toValue: motion.initialScale, duration: 90, easing: motion.easeOut, useNativeDriver: true }),
    ]).start(() => {
      setIsLogin(!isLogin);
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 160, easing: motion.easeOut, useNativeDriver: true }),
        Animated.timing(formScale, { toValue: 1, duration: 160, easing: motion.easeOut, useNativeDriver: true }),
      ]).start();
    });
  }

  const strength = getPasswordStrength();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="code-slash" size={16} color={theme.colors.textWhite} />
          </View>
          <Text style={styles.logoText}>CodeArena</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tag */}
          <Text style={styles.marqueeTag}>
            {'<'}CODE_ARENA_AUTH{'>'}
          </Text>

          {/* Headline */}
          <Text style={styles.title}>
            {isLogin ? 'Sign in to CodeArena' : 'Create Arena Account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Access your tournament profile, rankings, and active battle sprints.'
              : 'Link your LeetCode profile to participate in daily peer competitions.'}
          </Text>

          {/* Form Card (Smooth crossfade + scale 0.96 -> 1) */}
          <Animated.View
            style={[
              styles.formCard,
              {
                opacity: formOpacity,
                transform: [{ scale: formScale }],
              },
            ]}
          >
            {!isLogin && (
              <>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={theme.colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Alok"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="none"
                    accessibilityLabel="Username input"
                  />
                </View>
              </>
            )}

            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={16}
                color={theme.colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="alok11@gmail.com"
                placeholderTextColor={theme.colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Email input"
              />
            </View>

            {!isLogin && (
              <>
                <Text style={styles.inputLabel}>LeetCode Handle</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="terminal-outline"
                    size={16}
                    color={theme.colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="leetcode_username"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={leetcodeId}
                    onChangeText={setLeetcodeId}
                    autoCapitalize="none"
                    accessibilityLabel="LeetCode username handle input"
                  />
                </View>
              </>
            )}

            <View style={styles.passwordLabelRow}>
              <Text style={styles.inputLabel}>Password</Text>
              <ScalePressable
                onPress={() => setShowPassword(!showPassword)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Text style={styles.showHideText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </ScalePressable>
            </View>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={theme.colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                accessibilityLabel="Password input"
              />
            </View>

            {/* Password Strength Indicator */}
            {!isLogin && password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarBg}>
                  <View
                    style={[
                      styles.strengthBarFill,
                      { width: `${strength.width * 100}%`, backgroundColor: strength.color },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Submit Button */}
          <ScalePressable
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={isLogin ? 'Sign in to CodeArena' : 'Create Arena Account'}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textWhite} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={theme.colors.textWhite} />
              </View>
            )}
          </ScalePressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In Button */}
          <ScalePressable
            style={[styles.googleButton, (loading || googleLoading) && styles.submitButtonDisabled]}
            onPress={handleGooglePress}
            disabled={loading || googleLoading}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
          >
            {googleLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <View style={styles.googleButtonContent}>
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            )}
          </ScalePressable>

          {/* Switch mode */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already registered? '}
            </Text>
            <ScalePressable
              onPress={switchMode}
              accessibilityRole="button"
              accessibilityLabel={isLogin ? 'Switch to register form' : 'Switch to sign in form'}
            >
              <Text style={styles.switchLink}>
                {isLogin ? 'Register now' : 'Sign in'}
              </Text>
            </ScalePressable>
          </View>

          {/* Footer note */}
          <View style={styles.footer}>
            <Text style={styles.footerLink}>Protected by Supabase Cloud Authentication</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal: Link LeetCode for new Google users */}
      <Modal
        visible={googleNeedsLeetCode}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!googleLoading) {
            setGoogleNeedsLeetCode(false);
            setGooglePendingData(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderIcon}>
                <Ionicons name="logo-google" size={24} color="#EA4335" />
              </View>

              <Text style={styles.modalTitle}>Connect LeetCode Handle</Text>
              <Text style={styles.modalSubtitle}>
                Welcome{googlePendingData?.name ? `, ${googlePendingData.name}` : ''}! CodeArena matches your tournament solve deltas directly from LeetCode.
              </Text>

              <Text style={styles.inputLabel}>Your LeetCode Username</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="terminal-outline"
                  size={16}
                  color={theme.colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. tournguyen or alok_dev"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={googleLeetcodeId}
                  onChangeText={setGoogleLeetcodeId}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setGoogleNeedsLeetCode(false);
                    setGooglePendingData(null);
                  }}
                  disabled={googleLoading}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <ScalePressable
                  style={[styles.modalSubmitButton, googleLoading && styles.submitButtonDisabled]}
                  onPress={handleCompleteGoogleRegistration}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <ActivityIndicator color={theme.colors.textWhite} size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Complete Setup</Text>
                  )}
                </ScalePressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  marqueeTag: {
    ...theme.typography.monoTag,
    color: theme.colors.accentMuted,
    marginTop: 18,
    marginBottom: 4,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
    marginBottom: 18,
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  showHideText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accentMuted,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  strengthBarBg: {
    flex: 1,
    height: 3.5,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    height: 50,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: theme.colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  switchText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  switchLink: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  footerLink: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  dividerText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  googleButton: {
    backgroundColor: theme.colors.surface,
    height: 50,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  modalHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modalSubmitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  modalSubmitText: {
    color: theme.colors.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
});
