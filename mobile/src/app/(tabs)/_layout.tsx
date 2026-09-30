import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
  };

export default function TabsLayout() {
  const t = useTheme();
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.card },
        headerTintColor: t.text,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Odkrywaj', tabBarIcon: icon('🔥') }} />
      <Tabs.Screen name="feed" options={{ title: 'Oceniaj memy', tabBarIcon: icon('🎯') }} />
      <Tabs.Screen name="matches" options={{ title: 'Pary', tabBarIcon: icon('💬') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('🙂') }} />
    </Tabs>
  );
}
