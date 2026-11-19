import {
  AlignLeft,
  Brush,
  CaseSensitive,
  Copy,
  Crop,
  Droplet,
  Eraser,
  Gauge,
  Layers,
  ListOrdered,
  Move,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Type,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TextToolId =
  | 'list'
  | 'batch'
  | 'style'
  | 'font'
  | 'delete'
  | 'size'
  | 'split'
  | 'color'
  | 'format'
  | 'spacing'
  | 'animation'
  | 'opacity'
  | 'blending'
  | 'position'
  | 'mask';

interface TextBottomToolbarProps {
  onTool: (tool: TextToolId) => void;
}

const TOOLS: { id: TextToolId; label: string; icon: LucideIcon }[] = [
  { id: 'list', label: 'Subtitles', icon: ListOrdered },
  { id: 'batch', label: 'Batch Edit', icon: Layers },
  { id: 'style', label: 'Style', icon: Sparkles },
  { id: 'font', label: 'Font', icon: CaseSensitive },
  { id: 'delete', label: 'Delete', icon: Eraser },
  { id: 'size', label: 'Size', icon: Gauge },
  { id: 'split', label: 'Split', icon: Copy },
  { id: 'color', label: 'Color', icon: Palette },
  { id: 'format', label: 'Format', icon: AlignLeft },
  { id: 'spacing', label: 'Spacing', icon: SlidersHorizontal },
  { id: 'animation', label: 'Animation', icon: Brush },
  { id: 'opacity', label: 'Opacity', icon: Droplet },
  { id: 'blending', label: 'Blending', icon: Layers },
  { id: 'position', label: 'Position', icon: Move },
  { id: 'mask', label: 'Mask', icon: Crop },
];

const BUTTON_CLASS =
  'flex min-w-[60px] shrink-0 flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-neutral-200 transition active:scale-95';

export default function TextBottomToolbar({ onTool }: TextBottomToolbarProps) {
  return (
    <nav
      aria-label="Subtitle tools"
      className="flex h-[72px] shrink-0 items-start gap-0.5 overflow-x-auto border-t border-white/10 bg-[#101113] px-2 pt-2 text-neutral-200"
    >
      {TOOLS.map(({ id, label, icon: Icon }, index) => (
        <div key={id} className="flex items-center">
          {index > 0 && <span className="h-8 w-px shrink-0 bg-white/10" />}
          <button
            type="button"
            aria-label={label}
            onClick={() => onTool(id)}
            className={BUTTON_CLASS}
          >
            <Icon size={20} strokeWidth={1.75} />
            <span className="whitespace-nowrap text-[10px] font-medium leading-tight">{label}</span>
          </button>
        </div>
      ))}
    </nav>
  );
}
