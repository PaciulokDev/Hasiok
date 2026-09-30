import { Text, View } from 'react-native';
import { GENDERS, type PublicProfile } from '@hasiok/shared';
import { useTheme } from '../lib/theme';
import { MemeGrid } from './MemeGrid';
import { TagList } from './TagPicker';
import { Muted, Title } from './ui';

export function ProfileView({ profile }: { profile: PublicProfile }) {
  const t = useTheme();
  const gender = GENDERS.find((g) => g.id === profile.gender)?.label;
  return (
    <View style={{ gap: 10 }}>
      <Title>
        {profile.nickname}, {profile.age}
      </Title>
      <Muted>{[gender, profile.city].filter(Boolean).join(' · ')}</Muted>
      <MemeGrid memes={profile.memes} />
      {!!profile.bio && <Text style={{ color: t.text, fontSize: 15, lineHeight: 21 }}>{profile.bio}</Text>}
      <TagList tags={profile.humorTags} />
    </View>
  );
}
