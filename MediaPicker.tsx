import { useEffect, useRef, useState } from 'react';
import { Maximize2, Music, Plus, X } from 'lucide-react';
import IconButton from '@/components/IconButton';
import { importMediaFile } from '@/lib/mediaImport';
import { listLibrary, saveMedia } from '@/lib/mediaLibrary';
import { errorMessage, formatClock } from '@/lib/format';
import type { MediaAsset, PickerRequest } from '@/types';

const KIND_LABEL: Record<MediaAsset['kind'], string> = { video: 'Video', image: 'Photo', audio: 'Audio' };
const ACCEPT: Record<MediaAsset['kind'], string> = { video: 'video/*', image: 'image/*', audio: 'audio/*' };

interface MediaPickerProps {
  request: PickerRequest;
  onClose: () => void;
}

export default function MediaPicker({ request, onClose }: MediaPickerProps) {
  const [items, setItems] = useState<MediaAsset[] | null>(null);
  const [filter, setFilter] = useState<MediaAsset['kind'] | 'all'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    listLibrary()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setItems([]);
        setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const kinds = request.kinds;
  const shown = (items ?? []).filter((asset) => kinds.includes(asset.kind) && (filter === 'all' || asset.kind === filter));

  const toggle = (asset: MediaAsset) => {
    setSelected((prev) => {
      if (!request.multi) return prev.includes(asset.id) ? [] : [asset.id];
      return prev.includes(asset.id) ? prev.filter((id) => id !== asset.id) : [...prev, asset.id];
    });
  };

  const confirm = () => {
    const chosen = selected
      .map((id) => (items ?? []).find((asset) => asset.id === id))
      .filter((asset): asset is MediaAsset => asset !== undefined);
    if (chosen.length === 0) return;
    request.onConfirm(chosen);
    onClose();
  };

  const importFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImporting(true);
    setError(null);
    const imported: MediaAsset[] = [];
    try {
      for (const file of Array.from(files)) {
        const { asset, blob } = await importMediaFile(file);
        await saveMedia(asset, blob);
        imported.push(asset);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
    if (imported.length === 0) return;
    setItems((prev) => [...imported, ...(prev ?? [])]);
    const usable = imported.filter((asset) => kinds.includes(asset.kind));
    if (usable.length === 0) return;
    setSelected((prev) => (request.multi ? [...prev, ...usable.map((asset) => asset.id)] : [usable[0].id]));
  };

  const filters: (MediaAsset['kind'] | 'all')[] = kinds.length > 1 ? ['all', ...kinds] : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1c1d20] text-white animate-fade-in">
      <header className="flex h-14 shrink-0 items-center justify-between px-3">
        <IconButton label="Close" onClick={onClose}>
          <X size={24} />
        </IconButton>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15 active:scale-95 disabled:opacity-50"
        >
          <Plus size={16} />
          {importing ? 'Importing...' : 'Import'}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple={request.multi}
          accept={kinds.map((kind) => ACCEPT[kind]).join(',')}
          className="hidden"
          onChange={(event) => void importFiles(event.target.files)}
        />
      </header>

      {filters.length > 0 && (
        <div className="flex shrink-0 gap-6 border-b border-white/10 px-5">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`border-b-2 pb-3 pt-1 text-sm font-medium transition ${
                filter === item ? 'border-white text-white' : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {item === 'all' ? 'All' : KIND_LABEL[item]}
            </button>
          ))}
        </div>
      )}

      {error && <p className="bg-red-500/15 px-4 py-2 text-sm text-red-200">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {items === null && <p className="p-6 text-center text-sm text-neutral-400">Loading your media...</p>}
        {items !== null && shown.length === 0 && (
          <p className="p-6 text-center text-sm text-neutral-400">
            No media yet. Tap Import to add videos or photos from your phone.
          </p>
        )}
        <div className="grid grid-cols-3 gap-px">
          {shown.map((asset) => {
            const index = selected.indexOf(asset.id);
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => toggle(asset)}
                className="relative aspect-[3/4] overflow-hidden bg-[#2a2b30] transition active:opacity-80"
              >
                {asset.thumb ? (
                  <img src={asset.thumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-neutral-400">
                    <Music size={28} />
                  </span>
                )}
                <span
                  className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    index >= 0 ? 'border-sky-400 bg-sky-500 text-white' : 'border-white/70'
                  }`}
                >
                  {index >= 0 ? index + 1 : ''}
                </span>
                {asset.kind !== 'image' && (
                  <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-xs tabular-nums">
                    {formatClock(asset.duration)}
                  </span>
                )}
                {asset.kind === 'video' && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/40 p-0.5">
                    <Maximize2 size={12} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-white/10 px-4 py-3">
        <span className="text-sm text-neutral-300">Selected: {selected.length}</span>
        <button
          type="button"
          onClick={confirm}
          disabled={selected.length === 0}
          className="rounded-lg bg-sky-600 px-8 py-2.5 font-semibold text-white transition hover:bg-sky-500 active:scale-95 disabled:opacity-40"
        >
          Next
        </button>
      </footer>
    </div>
  );
}
