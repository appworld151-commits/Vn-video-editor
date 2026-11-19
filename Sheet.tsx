import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import IconButton from '@/components/IconButton';

interface SheetProps {
  title: string;
  onClose: () => void;
  dark?: boolean;
  children: ReactNode;
}

export default function Sheet({ title, onClose, dark = false, children }: SheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={`max-h-[85dvh] w-full max-w-lg animate-sheet-up overflow-y-auto rounded-t-2xl px-5 pb-8 pt-3 shadow-2xl ${
          dark ? 'bg-[#25262b] text-white' : 'bg-white text-neutral-900'
        }`}
      >
        <div className={`mx-auto mb-3 h-1 w-10 rounded-full ${dark ? 'bg-white/25' : 'bg-neutral-300'}`} />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <IconButton label="Close" onClick={onClose} className={dark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
