import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { MatchSummary, Message } from '@hasiok/shared';
import { MemeGrid } from '../../components/MemeGrid';
import { ProfileView } from '../../components/ProfileView';
import { Button, Card, ErrorText, Muted, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

const POLL_MS = 3000;

export default function ChatScreen() {
  const t = useTheme();
  const matchId = Number(useLocalSearchParams<{ id: string }>().id);
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [panel, setPanel] = useState<'none' | 'memes' | 'profile'>('none');
  const [error, setError] = useState('');
  const lastId = useRef(0);
  const list = useRef<FlatList<Message>>(null);

  useEffect(() => {
    api.matches().then((all) => {
      const found = all.find((m) => m.id === matchId);
      if (found) setMatch(found);
      else setError('Nie ma takiej pary');
    });
  }, [matchId]);

  // Proste odpytywanie serwera co kilka sekund o nowe wiadomości.
  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const fresh = await api.messages(matchId, lastId.current);
        if (!stopped && fresh.length > 0) {
          lastId.current = fresh[fresh.length - 1].id;
          setMessages((prev) => [...prev, ...fresh.filter((m) => !prev.some((p) => p.id === m.id))]);
        }
      } catch (err) {
        if (!stopped) setError((err as Error).message);
      }
    }
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [matchId]);

  async function send(content: { body?: string; memeId?: number }) {
    try {
      const msg = await api.sendMessage(matchId, content);
      lastId.current = Math.max(lastId.current, msg.id);
      setMessages((prev) => [...prev, msg]);
      setPanel('none');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function menu() {
    if (!match) return;
    Alert.alert(match.other.nickname, undefined, [
      { text: panel === 'profile' ? 'Ukryj profil' : 'Pokaż profil', onPress: () => setPanel(panel === 'profile' ? 'none' : 'profile') },
      {
        text: 'Rozłącz parę',
        onPress: async () => {
          await api.unmatch(match.id);
          router.back();
        },
      },
      {
        text: 'Zablokuj',
        style: 'destructive',
        onPress: async () => {
          await api.block(match.other.id);
          router.back();
        },
      },
      { text: 'Anuluj', style: 'cancel' },
    ]);
  }

  if (!match || !user) {
    return (
      <View style={styles.screen}>
        {error ? <ErrorText>{error}</ErrorText> : <Muted center>Ładowanie…</Muted>}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          title: `${match.other.nickname} · ${match.score}%`,
          headerRight: () => (
            <Pressable onPress={menu} hitSlop={12}>
              <Text style={{ fontSize: 22, color: t.text }}>⋯</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          panel === 'profile' ? (
            <Card style={{ marginBottom: 8 }}>
              <ProfileView profile={match.other} />
            </Card>
          ) : null
        }
        ListEmptyComponent={<Muted center>Przełam lody memem! 🧊🔨</Muted>}
        renderItem={({ item: m }) => {
          const mine = m.senderId === user.id;
          return (
            <View
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
                backgroundColor: mine ? t.primary : t.card,
                borderColor: mine ? t.primary : t.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 8,
                gap: 6,
              }}
            >
              {m.meme && <Image source={{ uri: api.imageUrl(m.meme.imageUrl) }} style={{ width: 220, height: 220, borderRadius: 10 }} contentFit="cover" />}
              {!!m.body && <Text style={{ color: mine ? t.onPrimary : t.text, fontSize: 15, paddingHorizontal: 4 }}>{m.body}</Text>}
            </View>
          );
        }}
      />
      <ErrorText>{error}</ErrorText>
      {panel === 'memes' && (
        <View style={{ padding: 12, backgroundColor: t.card, borderTopWidth: 1, borderColor: t.border, gap: 8 }}>
          <Muted>Wyślij mema z Twojej galerii albo z galerii {match.other.nickname}:</Muted>
          <MemeGrid memes={[...user.memes, ...match.other.memes]} action={{ label: 'Wyślij', onPress: (meme) => send({ memeId: meme.id }) }} />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: t.card, borderTopWidth: 1, borderColor: t.border }}>
        <Button title="🖼️" onPress={() => setPanel(panel === 'memes' ? 'none' : 'memes')} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Napisz coś zabawnego…"
          placeholderTextColor={t.muted}
          maxLength={1000}
          style={[styles.input, { flex: 1, color: t.text, borderColor: t.border, backgroundColor: t.bg }]}
        />
        <Button
          title="Wyślij"
          variant="primary"
          disabled={!text.trim()}
          onPress={() => {
            send({ body: text });
            setText('');
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
