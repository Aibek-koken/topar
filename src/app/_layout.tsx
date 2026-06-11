import '@/lib/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { TierCelebration } from '@/components/TierCelebration';
import { colors } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
      {/* Global overlay: fires on any tier crossing, wherever the user is */}
      <TierCelebration />
    </>
  );
}
