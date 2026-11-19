import { useState } from 'react';
import { Check } from 'lucide-react';
import Sheet from '@/components/Sheet';
import { ActionButton, Chip, SliderRow } from '@/components/SheetControls';
import { TEXT_COLORS } from '@/lib/effects';
import type { TextAlignment, TextAnimation, TextBlendMode, TextItem } from '@/types';

export type TextToolKind =
  | 'edit'
  | 'batch'
  | 'style'
  | 'font'
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

const TITLES: Record<TextToolKind, string> = {
  edit: 'Edit subtitle',
  batch: 'Batch edit',
  style: 'Style',
  font: 'Font',
  size: 'Size',
  split: 'Split subtitle',
  color: 'Color',
  format: 'Format',
  spacing: 'Spacing',
  animation: 'Animation',
  opacity: 'Opacity',
  blending: 'Blending',
  position: 'Position',
  mask: 'Mask',
};

const FONTS = [
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Arial', label: 'Arial' },
  { value: 'system-ui', label: 'System' },
];

const STYLES = [
  { value: 'plain', label: 'Plain' },
  { value: 'bold-white', label: 'Bold White' },
  { value: 'boxed', label: 'Boxed' },
  { value: 'outlined', label: 'Outlined' },
  { value: 'neon', label: 'Neon' },
  { value: 'shadow', label: 'Shadow' },
];

const ANIMATIONS: { value: TextAnimation; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'typewriter', label: 'Typewriter' },
];

const BLEND_MODES: { value: TextBlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
];

const ALIGNMENTS: { value: TextAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

interface TextToolSheetProps {
  kind: TextToolKind;
  item: TextItem;
  allTexts: TextItem[];
  onPatch: (patch: Partial<TextItem>) => void;
  onPatchAll: (patch: Partial<TextItem>) => void;
  onSplit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function TextToolSheet({
  kind,
  item,
  allTexts,
  onPatch,
  onPatchAll,
  onSplit,
  onDelete,
  onClose,
}: TextToolSheetProps) {
  const [editText, setEditText] = useState(item.text);

  switch (kind) {
    case 'edit':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <textarea
            value={editText}
            onChange={(event) => setEditText(event.target.value)}
            maxLength={120}
            rows={3}
            placeholder="Type your subtitle"
            className="w-full resize-none rounded-xl bg-white/10 p-3 text-base outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-sky-400"
          />
          <ActionButton
            className="mt-4 w-full"
            disabled={!editText.trim()}
            onClick={() => {
              onPatch({ text: editText.trim() });
              onClose();
            }}
          >
            Save text
          </ActionButton>
        </Sheet>
      );

    case 'batch':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <p className="text-sm text-neutral-300">
            Apply changes to all {allTexts.length} subtitle{allTexts.length !== 1 ? 's' : ''} at once.
          </p>
          <div className="mt-4">
            <SliderRow
              label="Size (all)"
              value={Math.round(item.size * 100)}
              min={2}
              max={12}
              step={1}
              display={`${Math.round(item.size * 100)}`}
              onChange={(v) => onPatchAll({ size: v / 100 })}
            />
          </div>
          <p className="mt-3 text-sm text-neutral-300">Color (all)</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {TEXT_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Color ${swatch}`}
                onClick={() => onPatchAll({ color: swatch })}
                style={{ background: swatch }}
                className="h-8 w-8 rounded-full border-2 border-white/20 transition active:scale-90"
              />
            ))}
          </div>
          <ActionButton variant="ghost" className="mt-4 w-full" onClick={onClose}>
            Done
          </ActionButton>
        </Sheet>
      );

    case 'style':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((style) => (
              <Chip
                key={style.value}
                active={item.stylePreset === style.value}
                onClick={() => {
                  onPatch({
                    stylePreset: style.value,
                    background: style.value === 'boxed',
                    outline: style.value === 'outlined',
                  });
                }}
                className="w-full px-2"
              >
                {style.label}
              </Chip>
            ))}
          </div>
        </Sheet>
      );

    case 'font':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <div className="flex flex-col gap-2">
            {FONTS.map((font) => (
              <button
                key={font.value}
                type="button"
                onClick={() => onPatch({ font: font.value })}
                className={`flex items-center justify-between rounded-xl px-4 py-4 text-left text-base transition active:scale-[0.99] ${
                  item.font === font.value ? 'bg-sky-500/20 text-sky-300' : 'bg-white/5 hover:bg-white/10'
                }`}
                style={{ fontFamily: font.value }}
              >
                {font.label}
                {item.font === font.value && <Check size={20} />}
              </button>
            ))}
          </div>
        </Sheet>
      );

    case 'size':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <SliderRow
            label="Size"
            value={Math.round(item.size * 100)}
            min={2}
            max={12}
            step={1}
            display={`${Math.round(item.size * 100)}`}
            onChange={(v) => onPatch({ size: v / 100 })}
          />
        </Sheet>
      );

    case 'split':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <p className="text-sm text-neutral-300">Split this subtitle at the current playhead position.</p>
          <ActionButton className="mt-4 w-full" onClick={() => { onSplit(); onClose(); }}>
            Split at playhead
          </ActionButton>
        </Sheet>
      );

    case 'color':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <div className="flex flex-wrap gap-3">
            {TEXT_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Color ${swatch}`}
                onClick={() => onPatch({ color: swatch })}
                style={{ background: swatch }}
                className={`h-10 w-10 rounded-full border-2 transition active:scale-90 ${
                  item.color === swatch ? 'border-sky-400 ring-2 ring-sky-400/40' : 'border-white/20'
                }`}
              />
            ))}
          </div>
        </Sheet>
      );

    case 'format':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <p className="text-sm text-neutral-300">Alignment</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ALIGNMENTS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onPatch({ align: option.value })}
                className={`rounded-lg py-3 text-sm font-medium transition active:scale-95 ${
                  item.align === option.value ? 'bg-sky-500 text-white' : 'bg-white/10 text-neutral-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-center justify-between py-2 text-sm">
            <span>Background box</span>
            <input type="checkbox" checked={item.background} onChange={(event) => onPatch({ background: event.target.checked })} className="h-5 w-5 accent-sky-400" />
          </label>
          <label className="flex items-center justify-between py-2 text-sm">
            <span>Text outline</span>
            <input type="checkbox" checked={item.outline} onChange={(event) => onPatch({ outline: event.target.checked })} className="h-5 w-5 accent-sky-400" />
          </label>
        </Sheet>
      );

    case 'spacing':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <SliderRow label="Letter spacing" value={item.letterSpacing} min={-5} max={20} step={0.5} display={`${item.letterSpacing.toFixed(1)}`} onChange={(v) => onPatch({ letterSpacing: v })} />
          <SliderRow label="Line height" value={item.lineHeight} min={0.8} max={3} step={0.1} display={`${item.lineHeight.toFixed(1)}`} onChange={(v) => onPatch({ lineHeight: v })} />
        </Sheet>
      );

    case 'animation':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <p className="text-sm text-neutral-300">Entrance</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ANIMATIONS.map((anim) => (
              <Chip key={anim.value} active={item.animationIn === anim.value} onClick={() => onPatch({ animationIn: anim.value })} className="w-full px-2">
                {anim.label}
              </Chip>
            ))}
          </div>
          <p className="mt-4 text-sm text-neutral-300">Exit</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ANIMATIONS.map((anim) => (
              <Chip key={anim.value} active={item.animationOut === anim.value} onClick={() => onPatch({ animationOut: anim.value })} className="w-full px-2">
                {anim.label}
              </Chip>
            ))}
          </div>
        </Sheet>
      );

    case 'opacity':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <SliderRow label="Opacity" value={Math.round(item.opacity * 100)} min={0} max={100} step={1} display={`${Math.round(item.opacity * 100)}%`} onChange={(v) => onPatch({ opacity: v / 100 })} />
        </Sheet>
      );

    case 'blending':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <div className="flex flex-col gap-2">
            {BLEND_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => onPatch({ blendMode: mode.value })}
                className={`flex items-center justify-between rounded-xl px-4 py-4 text-left text-base transition active:scale-[0.99] ${
                  item.blendMode === mode.value ? 'bg-sky-500/20 text-sky-300' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {mode.label}
                {item.blendMode === mode.value && <Check size={20} />}
              </button>
            ))}
          </div>
        </Sheet>
      );

    case 'position':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <SliderRow label="Position X" value={Math.round(item.x * 100)} min={0} max={100} step={1} display={`${Math.round(item.x * 100)}%`} onChange={(v) => onPatch({ x: v / 100 })} />
          <SliderRow label="Position Y" value={Math.round(item.y * 100)} min={0} max={100} step={1} display={`${Math.round(item.y * 100)}%`} onChange={(v) => onPatch({ y: v / 100 })} />
        </Sheet>
      );

    case 'mask':
      return (
        <Sheet dark title={TITLES[kind]} onClose={onClose}>
          <p className="py-4 text-sm text-neutral-400">
            Mask shapes (gradient fade, oval, split) are not yet available. This will be added in a future update.
          </p>
        </Sheet>
      );
  }
}
