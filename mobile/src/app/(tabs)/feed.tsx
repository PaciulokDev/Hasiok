import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { humorTagLabel, REACTIONS, type FeedMeme, type ReactionId } from '@hasiok/shared';
import { Button, Card, ErrorText, Muted, styles, Title } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

/** Kalibracja humoru: oceniasz memy innych, a my uczymy się, co Cię śmieszy. */
export default function FeedScreen() {
  const { refresh } = useAuth();
  const [feed, setFeed] = useState<FeedMeme[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.feed().then(setFeed, (err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  // Po wyjściu z zakładki odśwież licznik ocen w profilu.
  useFocusEffect(
    useCallback(
      () => () => {
        refresh().catch(() => {});
      },
      [refresh],
    ),
  );

  const meme = feed?.[0];

  async function react(reaction: ReactionId) {
    if (!meme || busy) return;
    setBusy(true);
    try {
      await api.react(meme.id, reaction);
      const rest = feed!.slice(1);
      setFeed(rest);
      if (rest.length === 0) load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Card>
        <Title>🎯 Co Cię śmieszy?</Title>
        <Muted>Oceniaj memy z galerii innych osób. Im więcej ocenisz, tym lepiej dobierzemy ludzi z Twoim humorem.</Muted>
      </Card>
      <ErrorText>{error}</ErrorText>
      {feed?.length === 0 && (
        <Card>
          <Muted center>Oceniono wszystkie memy! 🏆 Wróć, gdy pojawią się nowe.</Muted>
        </Card>
      )}
      {meme && (
        <Card>
          <Image source={{ uri: api.imageUrl(meme.imageUrl) }} style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }} contentFit="contain" />
          <Muted>
            z galerii: {meme.ownerNickname} · {meme.tags.map(humorTagLabel).join(', ')}
          </Muted>
          <View style={styles.row}>
            {REACTIONS.map((r) => (
              <View key={r.id} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Button title={r.emoji} onPress={() => react(r.id)} disabled={busy} style={{ width: '100%' }} />
                <Text style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>{r.label}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}
