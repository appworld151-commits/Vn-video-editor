import type { LucideIcon } from 'lucide-react';
import {
  Blend,
  ChevronLeft,
  ChevronsLeftRight,
  Crop,
  FlipHorizontal,
  Gauge,
  Camera,
  Layers,
  ListOrdered,
  Music,
  Palette,
  Ratio,
  RotateCw,
  Rewind,
  Scissors,
  Snowflake,
  Settings2,
  SlidersHorizontal,
  Sticker,
  Type,
  Volume2,
  Wand2,
} from 'lucide-react';

export type ToolId =
  | 'filter'
  | 'trim'
  | 'fx'
  | 'split'
  | 'music'
  | 'text'
  | 'sticker'
  | 'aspect'
  | 'quality'
  | 'speed'
  | 'volume'
  | 'fade'
  | 'crop'
  | 'rotate'
  | 'mirror'
  | 'transform'
  | 'adjust'
  | 'duplicate'
  | 'reverse'
  | 'freeze'
  | 'saveframe'
  | 'subtitles';

interface ToolDef {
  id: ToolId;
  label: string;
  icon: LucideIcon;
}

const MAIN_TOOLS: ToolDef[] = [
  { id: 'filter', label: 'Filter', icon: Palette },
  { id: 'trim', label: 'Trim', icon: ChevronsLeftRight },
  { id: 'fx', label: 'FX', icon: Wand2 },
  { id: 'split', label: 'Split', icon: Scissors },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'subtitles', label: 'Subtitles', icon: ListOrdered },
  { id: 'sticker', label: 'Sticker', icon: Sticker },
  { id: 'aspect', label: 'Aspect', icon: Ratio },
  { id: 'quality', label: 'Export', icon: Settings2 },
];

const CLIP_TOOLS: ToolDef[] = [
  { id: 'speed', label: 'Speed', icon: Gauge },
  { id: 'volume', label: 'Volume', icon: Volume2 },
  { id: 'fade', label: 'Fade', icon: Blend },
  { id: 'crop', label: 'Crop', icon: Crop },
  { id: 'transform', label: 'Transform', icon: Layers },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'rotate', label: 'Rotate', icon: RotateCw },
  { id: 'mirror', label: 'Mirror', icon: FlipHorizontal },
  { id: 'duplicate', label: 'Copy', icon: Layers },
  { id: 'reverse', label: 'Reverse', icon: Rewind },
  { id: 'freeze', label: 'Freeze', icon: Snowflake },
  { id: 'saveframe', label: 'Save Frame', icon: Camera },
];

const CLIP_ONLY_TOOLS: ToolId[] = ['filter', 'trim', 'fx', 'split'];

interface EditorToolbarProps {
  hasClip: boolean;
  clipSelected: boolean;
  onTool: (tool: ToolId) => void;
  onBack: () => void;
}

const BUTTON_CLASS =
  'flex min-w-[68px] shrink-0 flex-col items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition active:scale-95 disabled:opacity-35';

export default function EditorToolbar({ hasClip, clipSelected, onTool, onBack }: EditorToolbarProps) {
  const tools = clipSelected ? CLIP_TOOLS : MAIN_TOOLS;
  return (
    <nav
      aria-label="Editing tools"
      className="flex h-20 shrink-0 items-start gap-1 overflow-x-auto border-t border-white/10 bg-[#101113] px-2 pt-3 text-neutral-200"
    >
      {clipSelected && (
        <button type="button" onClick={onBack} className={BUTTON_CLASS}>
          <ChevronLeft size={22} strokeWidth={1.75} />
          <span className="whitespace-nowrap">Back</span>
        </button>
      )}
      {tools.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          disabled={!clipSelected && CLIP_ONLY_TOOLS.includes(id) && !hasClip}
          onClick={() => onTool(id)}
          className={BUTTON_CLASS}
        >
          <Icon size={22} strokeWidth={1.75} />
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
    </nav>
  );
}
