import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Check, Cloud, Film } from 'lucide-react';
import IconButton from '@/components/IconButton';
import { errorMessage } from '@/lib/format';
import { countCloudProjects } from '@/lib/projectsApi';

const FEATURES = [
  'Projects you can create, rename, organise into folders and delete',
  'Multi-track timeline with video, music, subtitles and stickers',
  'Trim, split, reverse and freeze frames',
  'Speed, volume, fades, crop, rotate and mirror',
  'Filters with brightness, contrast and saturation',
  'Text subtitles and emoji or image stickers',
  'Export in 480p, 720p or 1080p at 30 or 60 fps',
  'Projects saved to the cloud, media kept on your device',
];

interface AboutPageProps {
  onBack?: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div className={`${onBack ? 'fixed inset-0 z-50 overflow-y-auto bg-white animate-fade-in' : 'min-h-full'} text-neutral-900`}>
      <header className="flex h-14 items-center px-3">
        {onBack && (
          <IconButton label="Back" onClick={onBack}>
            <ChevronLeft size={24} />
          </IconButton>
        )}
        <h1 className={`${onBack ? 'ml-2' : 'px-2'} text-xl font-bold`}>About</h1>
      </header>

      <div className="flex flex-col items-center px-6 pb-12 pt-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-blue-800 text-white shadow-lg">
          <Film size={36} />
        </div>
        <h2 className="mt-4 text-2xl font-bold">VN Video Editor</h2>
        <p className="mt-1 text-sm text-neutral-500">Version 1.0.0</p>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-neutral-600">
          A mobile-first video editor for quick, polished edits. It is free to use with no subscription.
        </p>

        <ul className="mt-8 w-full max-w-sm space-y-3 text-left">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex gap-3 text-sm text-neutral-700">
              <Check size={18} className="mt-0.5 shrink-0 text-blue-600" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CloudPage() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    countCloudProjects()
      .then(setCount)
      .catch((err: unknown) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-h-full flex-col px-5 pb-28 pt-6 text-neutral-900">
      <h1 className="text-3xl font-bold">Cloud</h1>
      <section className="mt-6 rounded-2xl border border-neutral-200 p-5">
        <div className="flex items-center gap-3">
          <Cloud size={28} className="text-blue-600" />
          <div>
            <p className="text-base font-bold">Cloud project storage</p>
            <p className="text-sm text-neutral-500">Projects are saved to the cloud for free.</p>
          </div>
        </div>
        <div className="mt-5 text-sm">
          {error ? (
            <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-red-700">
              <span>{error}</span>
              <button type="button" onClick={load} className="font-semibold underline">
                Retry
              </button>
            </div>
          ) : (
            <p className="text-neutral-700">
              {count === null ? 'Checking your cloud projects...' : `${count} ${count === 1 ? 'project' : 'projects'} saved to the cloud`}
            </p>
          )}
        </div>
      </section>
      <p className="mt-4 px-1 text-sm leading-relaxed text-neutral-500">
        Tap Save in the editor to store your timeline in the cloud. Video and photo files stay on the device where you
        imported them.
      </p>
    </div>
  );
}
