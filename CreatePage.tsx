import { useEffect, useState } from 'react';
import { Scissors, X } from 'lucide-react';
import IconButton from '@/components/IconButton';

interface CreatePageProps {
  onClose: () => void;
  onNewVideo: () => void;
}

export default function CreatePage({ onClose, onNewVideo }: CreatePageProps) {
  const [usedMb, setUsedMb] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.storage?.estimate) return;
    navigator.storage
      .estimate()
      .then(({ usage }) => setUsedMb(usage ? (usage / 1048576).toFixed(1) : null))
      .catch(() => setUsedMb(null));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-neutral-900 animate-fade-in">
      <header className="flex h-14 shrink-0 items-center px-3">
        <IconButton label="Close" onClick={onClose}>
          <X size={24} />
        </IconButton>
        <h2 className="ml-2 text-xl font-bold">Create</h2>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-5 pt-4">
        <button
          type="button"
          onClick={onNewVideo}
          className="flex h-44 flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-800 text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
        >
          <Scissors size={40} strokeWidth={1.75} />
          <span className="text-xl font-bold">New Video</span>
          <span className="px-6 text-center text-sm text-white/90">Pick clips and photos from your phone</span>
        </button>
      </div>

      <footer className="border-t border-neutral-200 px-5 py-4 text-center text-sm text-neutral-500">
        {usedMb ? `Device storage used: ${usedMb} MB` : 'Free to use, no subscription needed'}
      </footer>
    </div>
  );
}
