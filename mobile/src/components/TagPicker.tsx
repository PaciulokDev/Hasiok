import { View } from 'react-native';
import { HUMOR_TAGS, type HumorTag } from '@hasiok/shared';
import { Chip, styles } from './ui';

export function TagPicker({ value, onChange, max }: { value: HumorTag[]; onChange: (t: HumorTag[]) => void; max: number }) {
  const toggle = (id: HumorTag) => {
    if (value.includes(id)) onChange(value.filter((t) => t !== id));
    else if (value.length < max) onChange([...value, id]);
  };
  return (
    <View style={styles.chips}>
      {HUMOR_TAGS.map((tag) => (
        <Chip key={tag.id} label={`${tag.emoji} ${tag.label}`} selected={value.includes(tag.id)} onPress={() => toggle(tag.id)} />
      ))}
    </View>
  );
}

export function TagList({ tags }: { tags: HumorTag[] }) {
  return (
    <View style={styles.chips}>
      {tags.map((id) => {
        const tag = HUMOR_TAGS.find((t) => t.id === id);
        return <Chip key={id} label={`${tag?.emoji ?? ''} ${tag?.label ?? id}`} />;
      })}
    </View>
  );
}
