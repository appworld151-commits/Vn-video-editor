import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Clapperboard, Music, Plus, Sticker, Type, type LucideIcon } from 'lucide-react';
import { clipDuration, clipStarts, totalDuration } from '@/lib/timeline';
import type { MediaAsset, MusicItem, StickerItem, TextItem, Timeline } from '@/types';

export const PX_PER_SECOND = 48;
const PAD_END = 160;

interface TimelinePanelProps {
  timeline: Timeline;
  assets: MediaAsset[];
  time: number;
  playing: boolean;
  selectedClipId: string | null;
  selectedTextId: string | null;
  onSeek: (time: number) => void;
  onSelectClip: (id: string) => void;
  onTapText: (item: TextItem) => void;
  onTapSticker: (item: StickerItem) => void;
  onTapMusic: (item: MusicItem) => void;
  onAddMedia: () => void;
}

function TrackLabel({ label, icon: Icon, height }: { label: string; icon: LucideIcon; height: number }) {
  return (
    <div className="flex items-center justify-center bg-[#16171a] text-neutral-400" style={{ height }} aria-label={label}>
      <Icon size={18} strokeWidth={1.75} />
    </div>
  );
}

export default function TimelinePanel({
  timeline,
  assets,
  time,
  playing,
  selectedClipId,
  selectedTextId,
  onSeek,
  onSelectClip,
  onTapText,
  onTapSticker,
  onTapMusic,
  onAddMedia,
}: TimelinePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const duration = totalDuration(timeline);
  const contentWidth = Math.max(duration, 10) * PX_PER_SECOND + PAD_END;
  const starts = clipStarts(timeline.clips);
  const assetName = (id: string) => assets.find((asset) => asset.id === id)?.name ?? 'Audio';

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !playing) return;
    const x = time * PX_PER_SECOND;
    const left = el.scrollLeft;
    const visibleEnd = left + el.clientWidth;
    if (x < left + 24 || x > visibleEnd - 48) el.scrollLeft = Math.max(0, x - el.clientWidth / 2);
  }, [time, playing]);

  const timeFromClientX = (clientX: number) => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.min(Math.max((clientX - rect.left) / PX_PER_SECOND, 0), duration);
  };

  const onRulerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    onSeek(timeFromClientX(event.clientX));
  };
  const onRulerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) onSeek(timeFromClientX(event.clientX));
  };
  const onRulerUp = () => {
    draggingRef.current = false;
  };

  const ticks = Math.ceil(contentWidth / PX_PER_SECOND);

  return (
    <section className="flex h-[212px] min-w-0 flex-1 flex-col border-t border-white/10 bg-[#16171a] text-white">
      <div className="flex min-h-0 flex-1">
        <div className="flex w-12 shrink-0 flex-col">
          <div className="h-7 shrink-0 bg-[#16171a]" />
          <TrackLabel label="Text" icon={Type} height={36} />
          <TrackLabel label="Stickers" icon={Sticker} height={36} />
          <TrackLabel label="Video" icon={Clapperboard} height={64} />
          <TrackLabel label="Music" icon={Music} height={36} />
        </div>

        <div ref={scrollRef} className="relative min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
          <div ref={contentRef} className="relative" style={{ width: contentWidth }} onClick={(event) => {
            if (event.target === event.currentTarget || (event.target as HTMLElement).dataset.track) onSeek(timeFromClientX(event.clientX));
          }}>
            <div
              className="relative h-7 touch-none select-none border-b border-white/10 text-[10px] text-neutral-400"
              onPointerDown={onRulerDown}
              onPointerMove={onRulerMove}
              onPointerUp={onRulerUp}
              onPointerCancel={onRulerUp}
            >
              {Array.from({ length: ticks }, (_, i) => (
                <span key={i} className="absolute top-1 tabular-nums" style={{ left: i * PX_PER_SECOND + 4 }}>
                  {i % 5 === 0 ? `${i}s` : ''}
                  <span className="absolute -bottom-1 left-0 h-2 w-px bg-neutral-600" />
                </span>
              ))}
            </div>

            <div className="flex flex-col">
              <div className="relative h-9" data-track="text">
                {timeline.texts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTapText(item)}
                    style={{ left: item.start * PX_PER_SECOND, width: Math.max(item.length * PX_PER_SECOND, 24) }}
                    className={`absolute top-1 bottom-1 truncate rounded-md px-2 text-left text-xs font-medium leading-7 text-neutral-900 transition active:scale-[0.98] ${
                      item.id === selectedTextId
                        ? 'bg-amber-400 ring-2 ring-white'
                        : 'bg-amber-400/90'
                    }`}
                  >
                    {item.text || 'Subtitle'}
                  </button>
                ))}
              </div>

              <div className="relative h-9" data-track="sticker">
                {timeline.stickers.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTapSticker(item)}
                    style={{ left: item.start * PX_PER_SECOND, width: Math.max(item.length * PX_PER_SECOND, 24) }}
                    className="absolute top-1 bottom-1 truncate rounded-md bg-emerald-400/90 px-2 text-left text-xs font-medium leading-7 text-neutral-900 transition active:scale-[0.98]"
                  >
                    {item.emoji ?? 'Image'}
                  </button>
                ))}
              </div>

              <div className="relative flex h-16 items-stretch gap-0.5 py-1" data-track="video">
                {timeline.clips.map((clip, index) => {
                  const asset = assets.find((item) => item.id === clip.assetId);
                  const width = Math.max(clipDuration(clip) * PX_PER_SECOND, 4);
                  const selected = clip.id === selectedClipId;
                  return (
                    <button
                      key={clip.id}
                      type="button"
                      aria-label={`Clip ${index + 1}`}
                      onClick={() => {
                        onSelectClip(clip.id);
                        onSeek(starts[index]);
                      }}
                      style={{
                        width,
                        backgroundImage: asset?.thumb ? `url("${asset.thumb}")` : undefined,
                      }}
                      className={`relative shrink-0 overflow-hidden rounded-md bg-cover bg-center transition active:scale-[0.99] ${
                        selected ? 'bg-neutral-700 ring-2 ring-sky-400' : 'bg-neutral-700 ring-1 ring-white/10'
                      }`}
                    >
                      {clip.kind === 'freeze' && (
                        <span className="absolute bottom-0.5 left-1 rounded bg-black/60 px-1 text-[9px] font-semibold">FREEZE</span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-label="Add media to timeline"
                  onClick={onAddMedia}
                  className="flex w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-white/30 text-white transition hover:bg-white/10 active:scale-95"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="relative h-9" data-track="music">
                {timeline.music.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTapMusic(item)}
                    style={{ left: item.start * PX_PER_SECOND, width: Math.max(item.length * PX_PER_SECOND, 24) }}
                    className="absolute top-1 bottom-1 flex items-center gap-1 truncate rounded-md bg-sky-400/90 px-2 text-xs font-medium text-neutral-900 transition active:scale-[0.98]"
                  >
                    <Music size={12} className="shrink-0" />
                    <span className="truncate">{assetName(item.assetId)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-sky-400"
              style={{ left: time * PX_PER_SECOND }}
            >
              <span className="absolute -left-[5px] top-0 h-2.5 w-3 rounded-b-sm bg-sky-400" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
