import { Clapperboard, Music, Plus, Sticker, Type } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface QuickAddToolbarProps {
  onAddVideo: () => void;
  onAddMusic: () => void;
  onAddText: () => void;
  onAddSticker: () => void;
}

const BUTTONS: { label: string; icon: LucideIcon; action: keyof QuickAddToolbarProps }[] = [
  { label: 'Music', icon: Music, action: 'onAddMusic' },
  { label: 'Text', icon: Type, action: 'onAddText' },
  { label: 'Sticker', icon: Sticker, action: 'onAddSticker' },
  { label: 'Video', icon: Clapperboard, action: 'onAddVideo' },
];

const BUTTON_CLASS =
  'flex w-full flex-col items-center gap-0.5 rounded-lg py-2 text-neutral-200 transition active:scale-95';

export default function QuickAddToolbar({ onAddVideo, onAddMusic, onAddText, onAddSticker }: QuickAddToolbarProps) {
  const handlers: Record<keyof QuickAddToolbarProps, () => void> = {
    onAddVideo,
    onAddMusic,
    onAddText,
    onAddSticker,
  };
  return (
    <aside
      aria-label="Quick add"
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-white/10 bg-[#101113] py-2"
    >
      <div className="mb-1 flex h-6 w-6 items-center justify-center text-neutral-500">
        <Plus size={16} strokeWidth={2.5} />
      </div>
      {BUTTONS.map(({ label, icon: Icon, action }) => (
        <button key={label} type="button" aria-label={`Add ${label}`} onClick={handlers[action]} className={BUTTON_CLASS}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <Icon size={18} strokeWidth={1.75} />
          </span>
          <span className="text-[10px] font-medium leading-tight">{label}</span>
        </button>
      ))}
    </aside>
  );
}
