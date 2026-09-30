import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from '../lib/theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, style]}>{children}</View>;
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'default' | 'danger' | 'link';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'default', disabled, loading, style }: ButtonProps) {
  const t = useTheme();
  const primary = variant === 'primary';
  const link = variant === 'link';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? t.primary : link ? 'transparent' : t.card,
          borderColor: primary ? t.primary : link ? 'transparent' : t.border,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? t.onPrimary : t.primary} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            { color: primary ? t.onPrimary : variant === 'danger' ? t.danger : link ? t.primary : t.text },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.chip, { borderColor: selected ? t.primary : t.border, backgroundColor: selected ? t.primary : 'transparent' }]}
    >
      <Text style={{ color: selected ? t.onPrimary : t.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const t = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 4 }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={t.muted}
        {...rest}
        style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.bg }, style]}
      />
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.text, fontWeight: '600', fontSize: 14 }}>{children}</Text>;
}

export function Muted({ children, center }: { children: ReactNode; center?: boolean }) {
  const t = useTheme();
  return <Text style={{ color: t.muted, fontSize: 14, textAlign: center ? 'center' : 'left' }}>{children}</Text>;
}

export function Title({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  const t = useTheme();
  if (!children) return null;
  return <Text style={{ color: t.danger }}>{children}</Text>;
}

export const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  button: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  buttonText: { fontWeight: '700', fontSize: 15, textAlign: 'center' },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row', gap: 12 },
  screen: { padding: 16, gap: 16 },
});
