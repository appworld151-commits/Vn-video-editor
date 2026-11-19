import { useEffect, useRef } from 'react';
import { Pause, Play, Redo2, Trash2, Undo2, X } from 'lucide-react';
import type { TextItem } from '@/types';

interface SubtitleListSheetProps {
  texts: TextItem[];
  time: number;
  playing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPlay: (item: TextItem) => void;
  onPause: () => void;
  onChangeText: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onDone: () => void;
}

/** Subtitle time as minutes:seconds.centiseconds, e.g. 01:23.45 */
function stamp(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${rest.toFixed(2).padStart(5, '0')}`;
}

export default function SubtitleListSheet({
  texts,
  time,
  playing,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPlay,
  onPause,
  onChangeText,
  onDelete,
  onSelect,
  onDone,
}: SubtitleListSheetProps) {
  const sorted = [...texts].sort((a, b) => a.start - b.start);
  const activeId = sorted.find((item) => time >= item.start && time < item.start + item.length)?.id ?? null;
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (playing && activeId) rowRefs.current.get(activeId)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeId, playing]);

  const iconBtn =
    'flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10 active:scale-95 disabled:opacity-30';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#121316] text-white animate-fade-in">
      <div className="flex h-14 shrink-0 items-center gap-1 px-2">
        <button type="button" aria-label="Close" onClick={onDone} className={iconBtn}>
          <X size={22} />
        </button>
        <button type="button" aria-label="Undo" disabled={!canUndo} onClick={onUndo} className={iconBtn}>
          <Undo2 size={20} />
        </button>
        <button type="button" aria-label="Redo" disabled={!canRedo} onClick={onRedo} className={iconBtn}>
          <Redo2 size={20} />
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onDone} className="px-3 py-2 text-base font-bold text-sky-400 transition active:scale-95">
          Done
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="m-auto px-8 text-center text-sm text-neutral-400">
          No subtitles yet. Add text from the timeline and it will show up here.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pb-10">
          {sorted.map((item) => {
            const active = item.id === activeId;
            const isPlayingRow = active && playing;
            return (
              <div
                key={item.id}
                ref={(node) => {
                  if (node) rowRefs.current.set(item.id, node);
                  else rowRefs.current.delete(item.id);
                }}
                className={`flex items-center gap-3 px-4 py-3 transition ${active ? 'bg-white/10' : ''}`}
              >
                <button
                  type="button"
                  aria-label={isPlayingRow ? 'Pause' : 'Play this subtitle'}
                  onClick={() => (isPlayingRow ? onPause() : onPlay(item))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition active:scale-90"
                >
                  {isPlayingRow ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                <span className="w-[4.5rem] shrink-0 text-xs tabular-nums text-neutral-400">{stamp(item.start)}</span>
                <textarea
                  dir="auto"
                  rows={Math.min(4, Math.max(1, item.text.split('\n').length))}
                  value={item.text}
                  onFocus={() => onSelect(item.id)}
                  onChange={(event) => onChangeText(item.id, event.target.value)}
                  className="min-w-0 flex-1 resize-none rounded-md bg-transparent px-1 py-1 text-base leading-snug outline-none focus:bg-white/5"
                />
                {active ? (
                  <button
                    type="button"
                    aria-label="Delete subtitle"
                    onClick={() => onDelete(item.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-300 transition hover:bg-white/10 active:scale-90"
                  >
                    <Trash2 size={17} />
                  </button>
                ) : (
                  <span className="h-8 w-8 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
