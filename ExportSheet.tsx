import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ActionButton } from '@/components/SheetControls';
import type { Player } from '@/lib/player';
import { errorMessage } from '@/lib/format';
import type { ExportFps, ExportQuality } from '@/types';

type Mode = 'auto' | 'manual';

const RESOLUTIONS: { value: ExportQuality; label: string }[] = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '1440p', label: '2.7K' },
  { value: '2160p', label: '4K' },
];
const FRAME_RATES: ExportFps[] = [24, 25, 30, 50, 60];
const BASE_BITRATE: Record<ExportQuality, number> = { '480p': 2.5, '720p': 5, '1080p': 9, '1440p': 16, '2160p': 32 };
const MIN_BITRATE = 1;
const MAX_BITRATE = 100;
const AUDIO_KBPS = 192;

export function recommendedBitrate(quality: ExportQuality, fps: ExportFps): number {
  const factor = fps >= 50 ? 1.5 : fps <= 24 ? 0.85 : 1;
  return Math.round(BASE_BITRATE[quality] * factor * 10) / 10;
}

export function estimateSizeMB(bitrateMbps: number, seconds: number, audioOnly: boolean): number {
  const bits = audioOnly ? AUDIO_KBPS * 1000 * seconds : (bitrateMbps * 1_000_000 + AUDIO_KBPS * 1000) * seconds;
  return bits / 8 / 1_000_000;
}

function formatSize(mb: number): string {
  return mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
}

interface ExportSheetProps {
  player: Player | null;
  projectName: string;
  duration: number;
  onNotify: (text: string, tone?: 'info' | 'error') => void;
  onClose: () => void;
}

function downloadBlob(blob: Blob, name: string) {
  const ext = blob.type.startsWith('audio') ? (blob.type.includes('mp4') ? 'm4a' : 'webm') : blob.type.includes('mp4') ? 'mp4' : 'webm';
  const safeName = name.replace(/[^\w-]+/g, '_') || 'video';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.${ext}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function Ticks({ labels }: { labels: string[] }) {
  return (
    <div className="mt-1 flex justify-between text-[11px] text-neutral-400">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

export default function ExportSheet({ player, projectName, duration, onNotify, onClose }: ExportSheetProps) {
  const [mode, setMode] = useState<Mode>('auto');
  const [quality, setQuality] = useState<ExportQuality>('1080p');
  const [fps, setFps] = useState<ExportFps>(30);
  const [bitrate, setBitrate] = useState<number>(recommendedBitrate('1080p', 30));
  const [audioOnly, setAudioOnly] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const busy = progress !== null;
  const preview = useMemo(() => player?.snapshot() ?? null, [player]);

  const effective =
    mode === 'auto'
      ? { quality: '1080p' as ExportQuality, fps: 30 as ExportFps, bitrate: recommendedBitrate('1080p', 30) }
      : { quality, fps, bitrate };
  const sizeMB = estimateSizeMB(effective.bitrate, duration, audioOnly);
  const highRes = mode === 'manual' && !audioOnly && (quality === '1440p' || quality === '2160p');

  const pickQuality = (next: ExportQuality) => {
    setQuality(next);
    setBitrate(recommendedBitrate(next, fps));
  };
  const pickFps = (next: ExportFps) => {
    setFps(next);
    setBitrate(recommendedBitrate(quality, next));
  };
  const changeBitrate = (value: number) => {
    if (Number.isNaN(value)) return;
    setBitrate(Math.min(MAX_BITRATE, Math.max(MIN_BITRATE, Math.round(value * 10) / 10)));
  };

  const run = async () => {
    if (!player) return;
    setProgress(0);
    try {
      const blob = await player.exportVideo(
        { quality: effective.quality, fps: effective.fps, bitrateMbps: effective.bitrate, audioOnly },
        (ratio) => setProgress(ratio),
      );
      if (blob.size === 0) throw new Error('The export produced an empty file. Check that your clips are loaded.');
      downloadBlob(blob, projectName);
      onNotify(audioOnly ? 'Audio exported' : 'Video exported');
      onClose();
    } catch (err) {
      onNotify(errorMessage(err), 'error');
    } finally {
      setProgress(null);
    }
  };

  const qualityIndex = RESOLUTIONS.findIndex((item) => item.value === quality);
  const fpsIndex = FRAME_RATES.indexOf(fps);
  const settingLabel = `${RESOLUTIONS.find((item) => item.value === effective.quality)?.label ?? effective.quality} / ${effective.fps}fps`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#16171a] text-white animate-fade-in">
      <div className="flex h-14 shrink-0 items-center px-3">
        <button
          type="button"
          aria-label="Close"
          disabled={busy}
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/10 disabled:opacity-40"
        >
          <X size={22} />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6">
        <div className="mx-auto flex aspect-video w-56 items-center justify-center overflow-hidden rounded-md bg-black">
          {preview ? <img src={preview} alt="" className="h-full w-full object-contain" /> : null}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Export Setting</p>
            <p className="text-xs text-neutral-400">{audioOnly ? 'Audio only' : settingLabel}</p>
          </div>
          <div className="flex rounded-lg bg-white/10 p-0.5 text-sm">
            {(['auto', 'manual'] as Mode[]).map((item) => (
              <button
                key={item}
                type="button"
                disabled={busy}
                onClick={() => setMode(item)}
                className={`rounded-md px-3 py-1 font-medium capitalize transition ${
                  mode === item ? 'bg-white/20 text-white' : 'text-neutral-400'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm">Export Audio Only</span>
          <button
            type="button"
            role="switch"
            aria-checked={audioOnly}
            disabled={busy}
            onClick={() => setAudioOnly((value) => !value)}
            className={`relative h-6 w-11 rounded-full transition ${audioOnly ? 'bg-sky-500' : 'bg-white/25'}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${audioOnly ? 'left-[22px]' : 'left-0.5'}`}
            />
          </button>
        </div>

        {mode === 'manual' && !audioOnly && (
          <>
            <div className="mt-6">
              <p className="text-sm">Resolution</p>
              <input
                type="range"
                aria-label="Resolution"
                min={0}
                max={RESOLUTIONS.length - 1}
                step={1}
                value={qualityIndex}
                disabled={busy}
                onChange={(event) => pickQuality(RESOLUTIONS[Number(event.target.value)].value)}
                className="mt-2 w-full accent-sky-500"
              />
              <Ticks labels={RESOLUTIONS.map((item) => item.label)} />
            </div>

            <div className="mt-5">
              <p className="text-sm">FPS</p>
              <input
                type="range"
                aria-label="Frame rate"
                min={0}
                max={FRAME_RATES.length - 1}
                step={1}
                value={fpsIndex}
                disabled={busy}
                onChange={(event) => pickFps(FRAME_RATES[Number(event.target.value)])}
                className="mt-2 w-full accent-sky-500"
              />
              <Ticks labels={FRAME_RATES.map(String)} />
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-sm">Average Bitrate (Mbps)</p>
                <input
                  type="number"
                  inputMode="decimal"
                  aria-label="Bitrate in Mbps"
                  min={MIN_BITRATE}
                  max={MAX_BITRATE}
                  step={0.5}
                  value={bitrate}
                  disabled={busy}
                  onChange={(event) => changeBitrate(Number(event.target.value))}
                  className="w-20 rounded-md bg-white/10 px-2 py-1 text-right text-sm tabular-nums outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>
              <input
                type="range"
                aria-label="Bitrate"
                min={MIN_BITRATE}
                max={MAX_BITRATE}
                step={0.5}
                value={bitrate}
                disabled={busy}
                onChange={(event) => changeBitrate(Number(event.target.value))}
                className="mt-2 w-full accent-sky-500"
              />
              <div className="mt-1 flex justify-between text-[11px] text-neutral-400">
                <span>{MIN_BITRATE.toFixed(1)} Mbps</span>
                <span>{MAX_BITRATE} Mbps</span>
              </div>
            </div>

            {highRes && (
              <p className="mt-4 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                2.7K and 4K rendering uses a lot of memory. If the export fails on your device, try 1080p instead.
              </p>
            )}
          </>
        )}

        <p className="mt-6 text-sm text-neutral-300">
          Estimated File Size <span className="tabular-nums">{formatSize(sizeMB)}</span>
        </p>

        {busy && (
          <div className="mt-5">
            <div className="flex justify-between text-sm text-neutral-300">
              <span>Exporting...</span>
              <span className="tabular-nums">{Math.round((progress ?? 0) * 100)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
            </div>
            <ActionButton variant="ghost" className="mt-4 w-full" onClick={() => player?.cancelExport()}>
              Stop and save what is ready
            </ActionButton>
          </div>
        )}
      </div>

      {!busy && (
        <div className="mx-auto w-full max-w-lg shrink-0 px-5 pb-6">
          <button
            type="button"
            disabled={!player}
            onClick={() => void run()}
            className="w-full rounded-full bg-sky-500 py-3.5 text-base font-bold text-white transition hover:bg-sky-400 active:scale-[0.98] disabled:opacity-40"
          >
            Export
          </button>
        </div>
      )}
    </div>
  );
}
