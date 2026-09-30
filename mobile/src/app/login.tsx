import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GENDERS, type Gender } from '@hasiok/shared';
import { Button, Card, Chip, ErrorText, Field, Label, Muted, styles } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

export default function LoginScreen() {
  const t = useTheme();
  const { user, signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthYear, setBirthYear] = useState('2000');
  const [gender, setGender] = useState<Gender>('woman');
  const [lookingFor, setLookingFor] = useState<Gender[]>(['man']);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Redirect href="/discover" />;

  async function submit() {
    setError('');
    setBusy(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register({ email, password, nickname, birthYear: Number(birthYear), gender, lookingFor });
      await signIn(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const toggleLookingFor = (g: Gender) =>
    setLookingFor((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 6, marginVertical: 16 }}>
            <Text style={{ fontSize: 48 }}>😂💘</Text>
            <Text style={{ fontSize: 36, fontWeight: '800', color: t.text }}>Hasiok</Text>
            <Muted center>Randki bez selfie. Pokaż swoje memy, a my znajdziemy kogoś, kto śmieje się z tego samego.</Muted>
          </View>

          <Card>
            <View style={styles.row}>
              <Button title="Logowanie" variant={mode === 'login' ? 'primary' : 'default'} onPress={() => setMode('login')} style={{ flex: 1 }} />
              <Button title="Rejestracja" variant={mode === 'register' ? 'primary' : 'default'} onPress={() => setMode('register')} style={{ flex: 1 }} />
            </View>
            <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Field label="Hasło" value={password} onChangeText={setPassword} secureTextEntry />

            {mode === 'register' && (
              <>
                <Field label="Nick" value={nickname} onChangeText={setNickname} maxLength={30} />
                <Field label="Rok urodzenia" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" maxLength={4} />
                <Label>Jestem</Label>
                <View style={styles.chips}>
                  {GENDERS.map((g) => (
                    <Chip key={g.id} label={g.label} selected={gender === g.id} onPress={() => setGender(g.id)} />
                  ))}
                </View>
                <Label>Szukam</Label>
                <View style={styles.chips}>
                  {GENDERS.map((g) => (
                    <Chip key={g.id} label={g.label} selected={lookingFor.includes(g.id)} onPress={() => toggleLookingFor(g.id)} />
                  ))}
                </View>
              </>
            )}

            <ErrorText>{error}</ErrorText>
            <Button title={mode === 'login' ? 'Zaloguj się' : 'Załóż konto'} variant="primary" onPress={submit} loading={busy} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
