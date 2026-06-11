import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { colors } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCatalogStore } from '@/store/useCatalogStore';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName, nameActive: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? nameActive : name} size={24} color={color} />
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const load = useCatalogStore((s) => s.load);
  const refreshJoined = useCatalogStore((s) => s.refreshJoined);
  const subscribeLive = useCatalogStore((s) => s.subscribeLive);

  // Catalog bootstrap + live group-buy updates for every tab
  useEffect(() => {
    load();
    const unsubscribe = subscribeLive();
    return unsubscribe;
  }, [load, subscribeLive]);

  useEffect(() => {
    if (userId) refreshJoined(userId);
  }, [userId, refreshJoined]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="groups"
        options={{ title: t('tabs.groups'), tabBarIcon: tabIcon('people-outline', 'people') }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: t('tabs.search'), tabBarIcon: tabIcon('search-outline', 'search') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('person-outline', 'person') }}
      />
    </Tabs>
  );
}
