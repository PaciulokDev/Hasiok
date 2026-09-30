import { useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { GENDERS, LIMITS, type Gender, type HumorTag, type MyProfile } from '@hasiok/shared';
import { MemeGrid } from '../../components/MemeGrid';
import { TagPicker } from '../../components/TagPicker';
import { Button, Card, Chip, ErrorText, Field, Label, Muted, styles, Title } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  function confirmDelete() {
    Alert.alert('Usunąć konto?', 'Znikną wszystkie Twoje memy, pary i rozmowy.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          await api.deleteMe();
          await signOut();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Gallery user={user} />
      <ProfileForm user={user} />
      <Card>
        <Muted>Zalogowano jako {user.email}</Muted>
        <View style={styles.row}>
          <Button title="Wyloguj" onPress={signOut} style={{ flex: 1 }} />
          <Button title="Usuń konto" variant="danger" onPress={confirmDelete} style={{ flex: 1 }} />
        </View>
      </Card>
    </ScrollView>
  );
}

function Gallery({ user }: { user: MyProfile }) {
  const { refresh } = useAuth();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<HumorTag[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled) setAsset(result.assets[0]);
  }

  async function upload() {
    if (!asset) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      const type = asset.mimeType ?? 'image/jpeg';
      const name = asset.fileName ?? `mem.${type.split('/')[1] ?? 'jpg'}`;
      if (Platform.OS === 'web') {
        form.append('image', await (await fetch(asset.uri)).blob(), name);
      } else {
        // React Native wysyła plik na podstawie jego adresu na telefonie.
        form.append('image', { uri: asset.uri, name, type } as unknown as Blob);
      }
      form.append('caption', caption);
      form.append('tags', JSON.stringify(tags));
      await api.uploadMeme(form);
      await refresh();
      setAsset(null);
      setCaption('');
      setTags([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function remove(memeId: number) {
    Alert.alert('Usunąć mema z galerii?', undefined, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          await api.deleteMeme(memeId);
          await refresh();
        },
      },
    ]);
  }

  return (
    <Card>
      <Title>
        🖼️ Moja galeria ({user.memes.length}/{LIMITS.maxMemesPerProfile})
      </Title>
      <Muted>To Twoja „twarz” w aplikacji. Wrzucaj memy, które najlepiej oddają Twój humor.</Muted>
      <MemeGrid memes={user.memes} action={{ label: 'Usuń', onPress: (m) => remove(m.id) }} />

      {user.memes.length < LIMITS.maxMemesPerProfile && (
        <View style={{ gap: 10 }}>
          <Muted>📵 Bez zdjęć siebie ani innych osób — tylko memy!</Muted>
          {asset ? (
            <Image source={{ uri: asset.uri }} style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }} contentFit="contain" />
          ) : null}
          <Button title={asset ? 'Wybierz innego mema' : '➕ Wybierz mema z telefonu'} onPress={pick} />
          {asset && (
            <>
              <Field label="Podpis (opcjonalnie)" value={caption} onChangeText={setCaption} maxLength={LIMITS.maxCaptionLength} />
              <Label>Kategorie (max {LIMITS.maxTagsPerMeme})</Label>
              <TagPicker value={tags} onChange={setTags} max={LIMITS.maxTagsPerMeme} />
              <ErrorText>{error}</ErrorText>
              <Button title="Dodaj do galerii" variant="primary" onPress={upload} loading={busy} disabled={tags.length === 0} />
            </>
          )}
        </View>
      )}
    </Card>
  );
}

function ProfileForm({ user }: { user: MyProfile }) {
  const { setUser } = useAuth();
  const [nickname, setNickname] = useState(user.nickname);
  const [city, setCity] = useState(user.city);
  const [bio, setBio] = useState(user.bio);
  const [humorTags, setHumorTags] = useState(user.humorTags);
  const [gender, setGender] = useState<Gender>(user.gender);
  const [lookingFor, setLookingFor] = useState<Gender[]>(user.lookingFor);
  const [ageMin, setAgeMin] = useState(String(user.ageMin));
  const [ageMax, setAgeMax] = useState(String(user.ageMax));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setStatus('');
    try {
      setUser(
        await api.updateMe({
          nickname,
          city,
          bio,
          humorTags,
          gender,
          lookingFor,
          ageMin: Number(ageMin),
          ageMax: Number(ageMax),
        }),
      );
      setStatus('Zapisano ✅');
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const toggleLookingFor = (g: Gender) =>
    setLookingFor((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  return (
    <Card>
      <Title>✏️ O mnie</Title>
      <Field label="Nick" value={nickname} onChangeText={setNickname} maxLength={30} />
      <Field label="Miasto" value={city} onChangeText={setCity} maxLength={60} />
      <Field
        label={`Opis (${bio.length}/${LIMITS.maxBioLength})`}
        value={bio}
        onChangeText={setBio}
        maxLength={LIMITS.maxBioLength}
        multiline
        style={{ minHeight: 100, textAlignVertical: 'top' }}
        placeholder="Napisz coś o sobie. Najlepiej coś śmiesznego 😉"
      />
      <Label>Mój humor (max {LIMITS.maxHumorTags})</Label>
      <TagPicker value={humorTags} onChange={setHumorTags} max={LIMITS.maxHumorTags} />
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
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="Wiek od" value={ageMin} onChangeText={setAgeMin} keyboardType="number-pad" maxLength={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="do" value={ageMax} onChangeText={setAgeMax} keyboardType="number-pad" maxLength={2} />
        </View>
      </View>
      {status ? status.includes('✅') ? <Muted>{status}</Muted> : <ErrorText>{status}</ErrorText> : null}
      <Button title="Zapisz profil" variant="primary" onPress={save} loading={busy} />
    </Card>
  );
}
