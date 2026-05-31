import { REACTION_EMOJIS } from '../../lib/utils';

interface ReactionPickerProps {
  visible: boolean;
  onReact: (type: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function ReactionPicker({ visible, onReact, onMouseEnter, onMouseLeave }: ReactionPickerProps) {
  if (!visible) return null;
  return (
    <div
      className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 px-2 py-1.5 flex gap-1 z-10"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
        <button
          key={type}
          onClick={() => onReact(type)}
          title={type}
          className="text-2xl hover:scale-125 transition-transform p-1"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
