import Sheet from '@/components/Sheet';
import { ActionButton, Chip, SliderRow } from '@/components/SheetControls';
import { cropForRatio } from '@/editor/editing';
import { formatSeconds } from '@/lib/format';
import { FILTER_OPTIONS } from '@/lib/effects';
import { ASPECT_RATIOS, FULL_CROP, MIN_CLIP_LENGTH, clipDuration } from '@/lib/timeline';
import type { Clip, MediaAsset } from '@/types';

export type ClipSheetKind = 'filter' | 'trim' | 'fx' | 'speed' | 'volume' | 'fade' | 'crop' | 'transform' | 'adjust';

const TITLES: Record<ClipSheetKind, string> = {
  filter: 'Filter',
  trim: 'Trim',
  fx: 'FX',
  speed: 'Speed',
  volume: 'Volume',
  fade: 'Fade',
  crop: 'Crop',
  transform: 'Transform',
  adjust: 'Adjust',
};

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3, 4];
const CROP_PRESETS = ['free', '16:9', '9:16', '1:1', '4:3'] as const;

interface ClipSheetProps {
  kind: ClipSheetKind;
  clip: Clip;
  index: number;
  total: number;
  asset: MediaAsset | undefined;
  onPatch: (patch: Partial<Clip>) => void;
  onFreeze: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
  onClose: () => void;
}

interface PanelProps {
  clip: Clip;
  onPatch: (patch: Partial<Clip>) => void;
}

export default function ClipSheet({ kind, clip, index, total, asset, onPatch, onFreeze, onDuplicate, onRemove, onMove, onClose }: ClipSheetProps) {
  const isVideo = clip.kind === 'video';
  return (
    <Sheet dark title={TITLES[kind]} onClose={onClose}>
      {kind === 'filter' && <FilterPanel clip={clip} onPatch={onPatch} />}
      {kind === 'trim' && (
        <TrimPanel
          clip={clip}
          sourceDuration={asset?.duration ?? clip.srcEnd}
          index={index}
          total={total}
          onPatch={onPatch}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onMove={onMove}
        />
      )}
      {kind === 'fx' && <FxPanel clip={clip} onPatch={onPatch} onFreeze={onFreeze} />}
      {kind === 'speed' &&
        (isVideo ? <SpeedPanel clip={clip} onPatch={onPatch} /> : <Note text="Speed applies to video clips only." />)}
      {kind === 'volume' &&
        (isVideo ? <VolumePanel clip={clip} onPatch={onPatch} /> : <Note text="Volume applies to video clips only." />)}
      {kind === 'fade' && <FadePanel clip={clip} onPatch={onPatch} />}
      {kind === 'crop' && <CropPanel clip={clip} asset={asset} onPatch={onPatch} />}
      {kind === 'transform' && <TransformPanel clip={clip} onPatch={onPatch} />}
      {kind === 'adjust' && <AdjustPanel clip={clip} onPatch={onPatch} />}
    </Sheet>
  );
}

function Note({ text }: { text: string }) {
  return <p className="py-4 text-sm text-neutral-400">{text}</p>;
}

function FilterPanel({ clip, onPatch }: PanelProps) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {FILTER_OPTIONS.map((option) => (
          <Chip key={option.id} active={clip.filter === option.id} onClick={() => onPatch({ filter: option.id })} className="w-full px-2">
            {option.label}
          </Chip>
        ))}
      </div>
      <ActionButton variant="ghost" className="mt-4 w-full" onClick={() => onPatch({ filter: 'none', brightness: 0, contrast: 0, saturation: 0, exposure: 0, temperature: 0 })}>
        Reset filter
      </ActionButton>
    </div>
  );
}

function TrimPanel({
  clip,
  sourceDuration,
  index,
  total,
  onPatch,
  onDuplicate,
  onRemove,
  onMove,
}: PanelProps & {
  sourceDuration: number;
  index: number;
  total: number;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
}) {
  return (
    <div>
      {clip.kind === 'video' ? (
        <>
          <SliderRow
            label="Start"
            value={clip.srcStart}
            min={0}
            max={Math.max(0, clip.srcEnd - MIN_CLIP_LENGTH)}
            step={0.05}
            display={`${formatSeconds(clip.srcStart)} s`}
            onChange={(v) => onPatch({ srcStart: v })}
          />
          <SliderRow
            label="End"
            value={clip.srcEnd}
            min={clip.srcStart + MIN_CLIP_LENGTH}
            max={sourceDuration}
            step={0.05}
            display={`${formatSeconds(clip.srcEnd)} s`}
            onChange={(v) => onPatch({ srcEnd: v })}
          />
        </>
      ) : (
        <SliderRow
          label="Duration"
          value={clip.hold}
          min={0.5}
          max={10}
          step={0.1}
          display={`${clip.hold.toFixed(1)} s`}
          onChange={(v) => onPatch({ hold: v })}
        />
      )}
      <p className="mt-2 text-sm text-neutral-400">Clip length: {formatSeconds(clipDuration(clip))} s</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <ActionButton variant="ghost" disabled={index === 0} onClick={() => onMove(-1)}>
          Move left
        </ActionButton>
        <ActionButton variant="ghost" disabled={index === total - 1} onClick={() => onMove(1)}>
          Move right
        </ActionButton>
        <ActionButton variant="ghost" onClick={onDuplicate}>
          Duplicate
        </ActionButton>
      </div>
      <ActionButton variant="danger" className="mt-3 w-full" onClick={onRemove}>
        Delete clip
      </ActionButton>
    </div>
  );
}

function FxPanel({ clip, onPatch, onFreeze }: PanelProps & { onFreeze: () => void }) {
  const isVideo = clip.kind === 'video';
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <ActionButton variant="ghost" disabled={!isVideo} onClick={() => onPatch({ reverse: !clip.reverse })}>
          {clip.reverse ? 'Reverse: On' : 'Reverse: Off'}
        </ActionButton>
        <ActionButton variant="ghost" disabled={!isVideo} onClick={onFreeze}>
          Freeze frame
        </ActionButton>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-neutral-400">
        Reverse plays the clip backwards. Freeze frame adds a still picture at the playhead.
      </p>
    </div>
  );
}

function SpeedPanel({ clip, onPatch }: PanelProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {SPEEDS.map((speed) => (
        <Chip key={speed} active={clip.speed === speed} onClick={() => onPatch({ speed })} className="w-full px-2">
          {speed}x
        </Chip>
      ))}
    </div>
  );
}

function VolumePanel({ clip, onPatch }: PanelProps) {
  return (
    <SliderRow
      label="Volume"
      value={Math.round(clip.volume * 100)}
      min={0}
      max={200}
      step={5}
      display={`${Math.round(clip.volume * 100)}%`}
      onChange={(v) => onPatch({ volume: v / 100 })}
    />
  );
}

function FadePanel({ clip, onPatch }: PanelProps) {
  const maxFade = Math.max(0, clipDuration(clip) / 2);
  return (
    <div>
      <SliderRow
        label="Fade in"
        value={clip.fadeIn}
        min={0}
        max={maxFade}
        step={0.1}
        display={`${clip.fadeIn.toFixed(1)} s`}
        onChange={(v) => onPatch({ fadeIn: v })}
      />
      <SliderRow
        label="Fade out"
        value={clip.fadeOut}
        min={0}
        max={maxFade}
        step={0.1}
        display={`${clip.fadeOut.toFixed(1)} s`}
        onChange={(v) => onPatch({ fadeOut: v })}
      />
    </div>
  );
}

function CropPanel({ clip, asset, onPatch }: PanelProps & { asset: MediaAsset | undefined }) {
  const hasSize = Boolean(asset && asset.width && asset.height);
  const currentRatio = hasSize && asset ? (clip.crop.w * asset.width) / (clip.crop.h * asset.height) : 0;

  const apply = (preset: (typeof CROP_PRESETS)[number]) => {
    if (preset === 'free') {
      onPatch({ crop: FULL_CROP });
      return;
    }
    if (!asset || !hasSize) return;
    onPatch({ crop: cropForRatio(ASPECT_RATIOS[preset], asset.width, asset.height) });
  };

  const isActive = (preset: (typeof CROP_PRESETS)[number]) => {
    if (preset === 'free') return clip.crop.w === 1 && clip.crop.h === 1;
    return hasSize && Math.abs(currentRatio - ASPECT_RATIOS[preset]) < 0.01;
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {CROP_PRESETS.map((preset) => (
          <Chip key={preset} active={isActive(preset)} onClick={() => apply(preset)} className="w-full px-2">
            {preset === 'free' ? 'Free' : preset}
          </Chip>
        ))}
      </div>
      <div className="mt-3">
        <SliderRow label="Crop X" value={clip.crop.x} min={0} max={1} step={0.01} display={`${Math.round(clip.crop.x * 100)}%`} onChange={(v) => onPatch({ crop: { ...clip.crop, x: v } })} />
        <SliderRow label="Crop Y" value={clip.crop.y} min={0} max={1} step={0.01} display={`${Math.round(clip.crop.y * 100)}%`} onChange={(v) => onPatch({ crop: { ...clip.crop, y: v } })} />
        <SliderRow label="Crop width" value={clip.crop.w} min={0.1} max={1} step={0.01} display={`${Math.round(clip.crop.w * 100)}%`} onChange={(v) => onPatch({ crop: { ...clip.crop, w: v } })} />
        <SliderRow label="Crop height" value={clip.crop.h} min={0.1} max={1} step={0.01} display={`${Math.round(clip.crop.h * 100)}%`} onChange={(v) => onPatch({ crop: { ...clip.crop, h: v } })} />
      </div>
      {!hasSize && <Note text="Crop presets need media dimensions." />}
    </div>
  );
}

function TransformPanel({ clip, onPatch }: PanelProps) {
  return (
    <div>
      <SliderRow label="Scale" value={Math.round(clip.scale * 100)} min={10} max={400} step={5} display={`${Math.round(clip.scale * 100)}%`} onChange={(v) => onPatch({ scale: v / 100 })} />
      <SliderRow label="Position X" value={Math.round(clip.posX * 100)} min={0} max={100} step={1} display={`${Math.round(clip.posX * 100)}%`} onChange={(v) => onPatch({ posX: v / 100 })} />
      <SliderRow label="Position Y" value={Math.round(clip.posY * 100)} min={0} max={100} step={1} display={`${Math.round(clip.posY * 100)}%`} onChange={(v) => onPatch({ posY: v / 100 })} />
      <SliderRow label="Opacity" value={Math.round(clip.opacity * 100)} min={0} max={100} step={1} display={`${Math.round(clip.opacity * 100)}%`} onChange={(v) => onPatch({ opacity: v / 100 })} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ActionButton variant="ghost" onClick={() => onPatch({ rotation: (((clip.rotation + 90) % 360) as Clip['rotation']) })}>
          Rotate 90
        </ActionButton>
        <ActionButton variant="ghost" onClick={() => onPatch({ mirror: !clip.mirror })}>
          {clip.mirror ? 'Mirror: On' : 'Mirror: Off'}
        </ActionButton>
      </div>
      <ActionButton variant="ghost" className="mt-3 w-full" onClick={() => onPatch({ scale: 1, posX: 0.5, posY: 0.5, opacity: 1, rotation: 0, mirror: false })}>
        Reset transform
      </ActionButton>
    </div>
  );
}

function AdjustPanel({ clip, onPatch }: PanelProps) {
  return (
    <div>
      <SliderRow label="Brightness" value={clip.brightness} min={-100} max={100} step={1} display={`${clip.brightness}`} onChange={(v) => onPatch({ brightness: v })} />
      <SliderRow label="Contrast" value={clip.contrast} min={-100} max={100} step={1} display={`${clip.contrast}`} onChange={(v) => onPatch({ contrast: v })} />
      <SliderRow label="Saturation" value={clip.saturation} min={-100} max={100} step={1} display={`${clip.saturation}`} onChange={(v) => onPatch({ saturation: v })} />
      <SliderRow label="Exposure" value={clip.exposure} min={-100} max={100} step={1} display={`${clip.exposure}`} onChange={(v) => onPatch({ exposure: v })} />
      <SliderRow label="Temperature" value={clip.temperature} min={-60} max={60} step={1} display={`${clip.temperature}`} onChange={(v) => onPatch({ temperature: v })} />
      <SliderRow label="Blur" value={clip.blur} min={0} max={20} step={0.5} display={`${clip.blur.toFixed(1)}px`} onChange={(v) => onPatch({ blur: v })} />
      <ActionButton variant="ghost" className="mt-4 w-full" onClick={() => onPatch({ brightness: 0, contrast: 0, saturation: 0, exposure: 0, temperature: 0, blur: 0 })}>
        Reset adjustments
      </ActionButton>
    </div>
  );
}
