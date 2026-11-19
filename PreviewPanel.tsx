import { useEffect, useRef } from 'react';
import { Pause, Play, Redo2, Undo2, Volume2, VolumeX } from 'lucide-react';
import IconButton from '@/components/IconButton';
import type { Player } from '@/lib/player';
import { formatClock } from '@/lib/format';

interface PreviewPanelProps {
  player: Player | null;
  time: number;
  duration: number;
  playing: boolean;
  muted: boolean;
  aspectLabel: string;
  canUndo: boolean;
  canRedo: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onAspect: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export default function PreviewPanel({
  player,
  time,
  duration,
  playing,
  muted,
  aspectLabel,
  canUndo,
  canRedo,
  onTogglePlay,
  onToggleMute,
  onAspect,
  onUndo,
  onRedo,
}: PreviewPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!player || !canvasRef.current) return;
    player.attachPreview(canvasRef.current);
    return () => player.attachPreview(null);
  }, [player]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-black">
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3">
        <canvas
          ref={canvasRef}
          onClick={onTogglePlay}
          aria-label="Video preview"
          className="max-h-full max-w-full cursor-pointer rounded-sm object-contain"
        />
        <button
          type="button"
          onClick={onAspect}
          className="absolute left-3 top-3 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/25 active:scale-95"
        >
          {aspectLabel}
        </button>
      </div>
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-3 text-white">
        <div className="flex items-center gap-1">
          <IconButton label="Undo" onClick={onUndo} disabled={!canUndo} className="text-white disabled:opacity-30">
            <Undo2 size={20} />
          </IconButton>
          <IconButton label="Redo" onClick={onRedo} disabled={!canRedo} className="text-white disabled:opacity-30">
            <Redo2 size={20} />
          </IconButton>
        </div>
        <div className="flex items-center gap-3">
          <IconButton label={playing ? 'Pause' : 'Play'} onClick={onTogglePlay} disabled={!player} className="bg-sky-500 text-white hover:bg-sky-400">
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </IconButton>
          <span className="min-w-[88px] text-center text-sm tabular-nums text-neutral-200">
            {formatClock(time)} / {formatClock(duration)}
          </span>
        </div>
        <IconButton label={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute} className="text-white">
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </IconButton>
      </div>
    </section>
  );
}
