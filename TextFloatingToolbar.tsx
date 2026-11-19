import { Copy, Delete, Diamond, Lock, Pencil, Scissors, Unlock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TextFloatingToolbarProps {
  locked: boolean;
  onEdit: () => void;
  onKeyframe: () => void;
  onSplit: () => void;
  onToggleLock: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const TOOLS: { label: string; icon: LucideIcon; action: keyof Omit<TextFloatingToolbarProps, 'locked'> }[] = [
  { label: 'Edit', icon: Pencil, action: 'onEdit' },
  { label: 'Keyframe', icon: Diamond, action: 'onKeyframe' },
  { label: 'Split', icon: Scissors, action: 'onSplit' },
  { label: 'Duplicate', icon: Copy, action: 'onDuplicate' },
  { label: 'Delete', icon: Delete, action: 'onDelete' },
];

export default function TextFloatingToolbar({
  locked,
  onEdit,
  onKeyframe,
  onSplit,
  onToggleLock,
  onDuplicate,
  onDelete,
}: TextFloatingToolbarProps) {
  const handlers: Record<string, () => void> = {
    onEdit,
    onKeyframe,
    onSplit,
    onToggleLock,
    onDuplicate,
    onDelete,
  };
  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-1 shadow-lg">
      {TOOLS.map(({ label, icon: Icon, action }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          onClick={handlers[action]}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/20 active:scale-90"
        >
          <Icon size={18} strokeWidth={2} />
        </button>
      ))}
      <button
        type="button"
        aria-label={locked ? 'Unlock' : 'Lock'}
        onClick={onToggleLock}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/20 active:scale-90"
      >
        {locked ? <Lock size={18} strokeWidth={2} /> : <Unlock size={18} strokeWidth={2} />}
      </button>
    </div>
  );
}
