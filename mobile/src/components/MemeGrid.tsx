import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Meme } from '@hasiok/shared';
import { api } from '../lib/api';
import { Muted } from './ui';

interface Props {
  memes: Meme[];
  /** Dodatkowa akcja pod memem (np. "Usuń" albo "Wyślij"). */
  action?: { label: string; onPress: (meme: Meme) => void };
}

/** Siatka memów 3 w rzędzie; dotknięcie otwiera mema na pełnym ekranie. */
export function MemeGrid({ memes, action }: Props) {
  const [open, setOpen] = useState<Meme | null>(null);
  if (memes.length === 0) return <Muted>Brak memów w galerii.</Muted>;
  return (
    <>
      <View style={s.grid}>
        {memes.map((meme) => (
          <View key={meme.id} style={s.tile}>
            <Pressable onPress={() => setOpen(meme)}>
              <Image source={{ uri: api.imageUrl(meme.imageUrl) }} style={s.image} contentFit="cover" />
            </Pressable>
            {action && (
              <Pressable style={s.action} onPress={() => action.onPress(meme)}>
                <Text style={s.actionText}>{action.label}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(null)}>
          {open && (
            <>
              <Image source={{ uri: api.imageUrl(open.imageUrl) }} style={s.full} contentFit="contain" />
              {!!open.caption && <Text style={s.caption}>{open.caption}</Text>}
            </>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: { width: '32%' },
  image: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#ddd' },
  action: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  full: { width: '100%', height: '75%' },
  caption: { color: '#fff', marginTop: 12, fontSize: 16, textAlign: 'center' },
});
