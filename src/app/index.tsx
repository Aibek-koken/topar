import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';

// The single place where auth/onboarding gating happens (avoids redirect loops)
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <Text style={styles.logo}>Topar</Text>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (status === 'signedOut') return <Redirect href="/(auth)/welcome" />;
  if (!profile?.onboarding_completed) return <Redirect href="/(onboarding)/interests" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  logo: { fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: -1 },
});
