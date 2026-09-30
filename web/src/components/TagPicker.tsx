import { HUMOR_TAGS, type HumorTag } from '@hasiok/shared';

interface Props {
  value: HumorTag[];
  onChange: (tags: HumorTag[]) => void;
  max: number;
}

export function TagPicker({ value, onChange, max }: Props) {
  const toggle = (id: HumorTag) => {
    if (value.includes(id)) onChange(value.filter((t) => t !== id));
    else if (value.length < max) onChange([...value, id]);
  };
  return (
    <div className="chips">
      {HUMOR_TAGS.map((tag) => (
        <button
          type="button"
          key={tag.id}
          className={`chip ${value.includes(tag.id) ? 'chip-on' : ''}`}
          onClick={() => toggle(tag.id)}
          disabled={!value.includes(tag.id) && value.length >= max}
        >
          {tag.emoji} {tag.label}
        </button>
      ))}
    </div>
  );
}

export function TagList({ tags }: { tags: HumorTag[] }) {
  return (
    <div className="chips">
      {tags.map((id) => {
        const tag = HUMOR_TAGS.find((t) => t.id === id);
        return (
          <span key={id} className="chip chip-static">
            {tag?.emoji} {tag?.label ?? id}
          </span>
        );
      })}
    </div>
  );
}
