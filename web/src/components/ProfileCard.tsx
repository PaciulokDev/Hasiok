import { GENDERS, type PublicProfile } from '@hasiok/shared';
import { MemeGrid } from './MemeGrid';
import { TagList } from './TagPicker';

export function ProfileCard({ profile }: { profile: PublicProfile }) {
  const gender = GENDERS.find((g) => g.id === profile.gender)?.label;
  return (
    <div className="profile">
      <h2>
        {profile.nickname}, {profile.age}
      </h2>
      <p className="muted">
        {[gender, profile.city].filter(Boolean).join(' · ')}
      </p>
      <MemeGrid memes={profile.memes} />
      {profile.bio && <p className="bio">{profile.bio}</p>}
      <TagList tags={profile.humorTags} />
    </div>
  );
}
