import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import type { MatchSummary } from '@hasiok/shared';
import { Card, ErrorText, Muted } from '../../components/ui';
import { api } from '../../lib/api';
import { useTheme } from '../../lib/theme';

export default function MatchesScreen() {
  const t = useTheme();
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setMatches(await api.matches());
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  // Odśwież listę za każdym razem, gdy wchodzisz w zakładkę.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <FlatList
      data={matches ?? []}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      ListHeaderComponent={<ErrorText>{error}</ErrorText>}
      ListEmptyComponent={
        matches ? (
          <Card>
            <Muted center>Jeszcze nie masz par. Polub kilka profili w zakładce „Odkrywaj”! 😂</Muted>
          </Card>
        ) : null
      }
      renderItem={({ item: m }) => {
        const cover = m.other.memes[0];
        const last = m.lastMessage;
        return (
          <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: String(m.id) } })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
              {cover ? (
                <Image source={{ uri: api.imageUrl(cover.imageUrl) }} style={{ width: 60, height: 60, borderRadius: 12 }} />
              ) : (
                <Text style={{ fontSize: 40 }}>😂</Text>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: t.text, fontWeight: '700', fontSize: 16 }}>
                  {m.other.nickname}, {m.other.age}{' '}
                  <Text style={{ color: t.primary }}>{m.score}%</Text>
                </Text>
                <Muted>{last ? (last.meme ? '🖼️ Mem' : last.body) : 'Nowa para! Wyślij pierwszego mema.'}</Muted>
              </View>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
