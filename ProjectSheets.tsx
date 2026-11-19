import { useState } from 'react';
import Sheet from '@/components/Sheet';
import { ActionButton, Chip } from '@/components/SheetControls';

const FOLDERS = ['Default', 'Imported'];

interface ProjectSettingsSheetProps {
  name: string;
  folder: string;
  onSave: (name: string, folder: string) => void;
  onClose: () => void;
}

export function ProjectSettingsSheet({ name, folder, onSave, onClose }: ProjectSettingsSheetProps) {
  const [draftName, setDraftName] = useState(name);
  const [draftFolder, setDraftFolder] = useState(folder);
  const trimmed = draftName.trim();

  return (
    <Sheet dark title="Project settings" onClose={onClose}>
      <label className="block text-sm text-neutral-300">
        Name
        <input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          maxLength={80}
          className="mt-2 h-12 w-full rounded-xl bg-white/10 px-4 text-base text-white outline-none focus:ring-2 focus:ring-sky-400"
        />
      </label>
      <p className="mt-5 text-sm text-neutral-300">Folder</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {FOLDERS.map((item) => (
          <Chip key={item} active={draftFolder === item} onClick={() => setDraftFolder(item)}>
            {item}
          </Chip>
        ))}
      </div>
      <ActionButton className="mt-6 w-full" disabled={!trimmed} onClick={() => onSave(trimmed, draftFolder)}>
        Save
      </ActionButton>
    </Sheet>
  );
}
