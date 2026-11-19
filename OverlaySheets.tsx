import { useState } from 'react';
import { Check } from 'lucide-react';
import Sheet from '@/components/Sheet';
import { ActionButton, SliderRow } from '@/components/SheetControls';
import { TEXT_COLORS } from '@/lib/effects';
import { formatSeconds } from '@/lib/format';
import type { AspectRatio, MediaAsset, MusicItem, TextAlignment, TextItem } from '@/types';

const EMOJIS = ['⭐', '❤️', '🔥', '✨', '👍', '🎉', '💯', '😂', '😍', '📍', '🎵', '➡️'];
const ALIGNMENTS: { value: TextAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

interface TextSheetProps {
  draft: TextItem;
  isNew: boolean;
  onSave: (item: TextItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function TextSheet({ draft, isNew, onSave, onDelete, onClose }: TextSheetProps) {
  const [text, setText] = useState(draft.text);
  const [color, setColor] = useState(draft.color);
  const [background, setBackground] = useState(draft.background);
  const [outline, setOutline] = useState(draft.outline);
  const [align, setAlign] = useState<TextAlignment>(draft.align);
  const [size, setSize] = useState(draft.size);
  const [length, setLength] = useState(draft.length);
  const trimmed = text.trim();

  return (
    <Sheet dark title={isNew ? 'Add subtitle' : 'Edit subtitle'} onClose={onClose}>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={120}
        rows={3}
        placeholder="Type your subtitle"
        className="w-full resize-none rounded-xl bg-white/10 p-3 text-base outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-sky-400"
      />
      <p className="mt-5 text-sm text-neutral-300">Color</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {TEXT_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={`Color ${swatch}`}
            onClick={() => setColor(swatch)}
            style={{ background: swatch }}
            className={`h-8 w-8 rounded-full border-2 transition active:scale-90 ${
              color === swatch ? 'border-sky-400 ring-2 ring-sky-400/40' : 'border-white/20'
            }`}
          />
        ))}
      </div>
      <SliderRow label="Size" value={Math.round(size * 100)} min={2} max={12} step={1} display={`${Math.round(size * 100)}`} onChange={(v) => setSize(v / 100)} />
      <SliderRow label="Length" value={length} min={0.5} max={10} step={0.5} display={`${length.toFixed(1)} s`} onChange={setLength} />
      <p className="mt-3 text-sm text-neutral-300">Alignment</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {ALIGNMENTS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setAlign(option.value)}
            className={`rounded-lg py-2 text-sm font-medium transition active:scale-95 ${
              align === option.value ? 'bg-sky-500 text-white' : 'bg-white/10 text-neutral-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center justify-between py-2 text-sm">
        <span>Background box</span>
        <input type="checkbox" checked={background} onChange={(event) => setBackground(event.target.checked)} className="h-5 w-5 accent-sky-400" />
      </label>
      <label className="flex items-center justify-between py-2 text-sm">
        <span>Text outline</span>
        <input type="checkbox" checked={outline} onChange={(event) => setOutline(event.target.checked)} className="h-5 w-5 accent-sky-400" />
      </label>
      <div className="mt-6 flex gap-3">
        {!isNew && (
          <ActionButton variant="danger" onClick={() => onDelete(draft.id)}>
            Delete
          </ActionButton>
        )}
        <ActionButton
          className="flex-1"
          disabled={!trimmed}
          onClick={() => onSave({ ...draft, text: trimmed, color, background, outline, align, size, length })}
        >
          Save
        </ActionButton>
      </div>
    </Sheet>
  );
}

interface StickerSheetProps {
  onEmoji: (emoji: string) => void;
  onImage: () => void;
  onClose: () => void;
}

export function StickerSheet({ onEmoji, onImage, onClose }: StickerSheetProps) {
  return (
    <Sheet dark title="Stickers" onClose={onClose}>
      <div className="grid grid-cols-6 gap-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onEmoji(emoji)}
            className="flex aspect-square items-center justify-center rounded-xl bg-white/5 text-2xl transition hover:bg-white/10 active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>
      <ActionButton variant="ghost" className="mt-5 w-full" onClick={onImage}>
        Add image from media
      </ActionButton>
    </Sheet>
  );
}

interface RemoveItemSheetProps {
  title: string;
  onRemove: () => void;
  onClose: () => void;
}

export function RemoveItemSheet({ title, onRemove, onClose }: RemoveItemSheetProps) {
  return (
    <Sheet dark title={title} onClose={onClose}>
      <ActionButton variant="danger" className="w-full" onClick={onRemove}>
        Remove from timeline
      </ActionButton>
    </Sheet>
  );
}

interface MusicSheetProps {
  item: MusicItem;
  name: string;
  asset: MediaAsset | undefined;
  onPatch: (patch: Partial<MusicItem>) => void;
  onSplit: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export function MusicSheet({ item, name, asset, onPatch, onSplit, onRemove, onClose }: MusicSheetProps) {
  const percent = Math.round(item.volume * 100);
  const maxFade = Math.max(0, item.length / 2);
  const maxLen = asset ? asset.duration : item.length;
  return (
    <Sheet dark title="Music" onClose={onClose}>
      <p className="truncate text-sm text-neutral-300">{name}</p>
      <div className="mt-2">
        <SliderRow label="Start" value={item.start} min={0} max={Math.max(0, maxLen)} step={0.1} display={`${formatSeconds(item.start)} s`} onChange={(v) => onPatch({ start: v, offset: v })} />
        <SliderRow label="Length" value={item.length} min={0.2} max={Math.max(0.2, maxLen - item.start)} step={0.1} display={`${formatSeconds(item.length)} s`} onChange={(v) => onPatch({ length: v })} />
        <SliderRow label="Volume" value={percent} min={0} max={200} step={5} display={`${percent}%`} onChange={(v) => onPatch({ volume: v / 100 })} />
        <SliderRow label="Fade in" value={item.fadeIn} min={0} max={maxFade} step={0.1} display={`${item.fadeIn.toFixed(1)} s`} onChange={(v) => onPatch({ fadeIn: v })} />
        <SliderRow label="Fade out" value={item.fadeOut} min={0} max={maxFade} step={0.1} display={`${item.fadeOut.toFixed(1)} s`} onChange={(v) => onPatch({ fadeOut: v })} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ActionButton variant="ghost" onClick={onSplit}>
          Split at playhead
        </ActionButton>
        <ActionButton variant="danger" onClick={onRemove}>
          Remove
        </ActionButton>
      </div>
    </Sheet>
  );
}

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
];

export function AspectSheet({ value, onPick, onClose }: { value: AspectRatio; onPick: (v: AspectRatio) => void; onClose: () => void }) {
  return (
    <Sheet dark title="Aspect ratio" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {ASPECT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPick(option.value)}
            className={`flex items-center justify-between rounded-xl px-4 py-4 text-left text-base transition active:scale-[0.99] ${
              value === option.value ? 'bg-sky-500/20 text-sky-300' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {option.label}
            {value === option.value && <Check size={20} />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
