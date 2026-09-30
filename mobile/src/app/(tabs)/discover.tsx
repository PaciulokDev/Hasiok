import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import type { Candidate } from '@hasiok/shared';
import { ProfileView } from '../../components/ProfileView';
import { Button, Card, ErrorText, Muted, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

export default function DiscoverScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<{ id: number; nickname: string } | null>(null);

  const load = useCallback(() => {
    setError('');
    api.discover().then(setCandidates, (err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  const current = candidates?.[0];

  async function decide(liked: boolean) {
    if (!current || busy) return;
    setBusy(true);
    try {
      const res = await api.swipe(current.profile.id, liked);
      if (res.matched && res.matchId) setMatch({ id: res.matchId, nickname: current.profile.nickname });
      setCandidates((list) => list?.slice(1) ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function report() {
    if (!current) return;
    Alert.alert('Zgłoś profil', 'Co jest nie tak?', [
      { text: 'Zdjęcia osób zamiast memów', onPress: () => sendReport('Zdjęcia osób zamiast memów') },
      { text: 'Obraźliwe treści', onPress: () => sendReport('Obraźliwe treści') },
      { text: 'Anuluj', style: 'cancel' },
    ]);
  }

  async function sendReport(reason: string) {
    await api.report(current!.profile.id, reason).catch((err) => setError(err.message));
    await decide(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {user && user.memes.length === 0 && (
        <Card style={{ backgroundColor: t.accent }}>
          <Text>🖼️ Nie masz memów w galerii — inni Cię nie widzą.</Text>
          <Link href="/profile" style={{ color: '#1e1b2e', fontWeight: '700' }}>
            Dodaj memy →
          </Link>
        </Card>
      )}
      {user && user.reactionsCount < 10 && (
        <Card>
          <Muted>🎯 Oceń kilka memów, żeby dopasowania były trafniejsze.</Muted>
          <Link href="/feed" style={{ color: t.primary, fontWeight: '700' }}>
            Oceniaj memy →
          </Link>
        </Card>
      )}
      <ErrorText>{error}</ErrorText>
      {candidates === null && !error && <Muted center>Szukam ludzi z podobnym humorem…</Muted>}
      {candidates?.length === 0 && (
        <Card>
          <Muted center>🦗 Na razie nikogo nowego. Wróć później albo poszerz preferencje w profilu.</Muted>
          <Button title="Odśwież" onPress={load} />
        </Card>
      )}

      {current && (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontSize: 32, fontWeight: '800', color: t.primary }}>{current.score}%</Text>
            <Muted>zgodności humoru</Muted>
          </View>
          {current.reasons.map((r) => (
            <Muted key={r.kind}>• {r.text}</Muted>
          ))}
          <ProfileView profile={current.profile} />
          <View style={styles.row}>
            <Button title="😐 Nie mój humor" onPress={() => decide(false)} disabled={busy} style={{ flex: 1 }} />
            <Button title="😂 Śmieszne!" variant="primary" onPress={() => decide(true)} disabled={busy} style={{ flex: 1 }} />
          </View>
          <Button title="Zgłoś profil" variant="link" onPress={report} />
        </Card>
      )}

      <Modal visible={!!match} transparent animationType="slide" onRequestClose={() => setMatch(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <Card style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 48 }}>🎉😂🎉</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: t.text }}>Jest para!</Text>
            <Muted center>Ty i {match?.nickname} śmiejecie się z tego samego.</Muted>
            <Button
              title="Wyślij mema na przełamanie lodów"
              variant="primary"
              onPress={() => {
                const id = match!.id;
                setMatch(null);
                router.push({ pathname: '/chat/[id]', params: { id: String(id) } });
              }}
            />
            <Button title="Oglądaj dalej" variant="link" onPress={() => setMatch(null)} />
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}
