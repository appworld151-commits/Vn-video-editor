import { useState } from 'react';
import BottomNav, { type NavTab, type Screen } from '@/components/BottomNav';
import MediaPicker from '@/components/MediaPicker';
import EditorPage from '@/editor/EditorPage';
import { createProject } from '@/editor/editing';
import CreatePage from '@/pages/CreatePage';
import ProjectsPage from '@/pages/ProjectsPage';
import { AboutPage, CloudPage } from '@/pages/InfoPages';
import type { PickerRequest, Project } from '@/types';

export default function App() {
  const [screen, setScreen] = useState<Screen>('projects');
  const [searchKey, setSearchKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);

  const startNewVideo = () => {
    setCreateOpen(false);
    setPicker({ multi: true, kinds: ['video', 'image'], onConfirm: (assets) => setEditing(createProject(assets)) });
  };

  const handleNav = (tab: NavTab) => {
    if (tab === 'create') {
      setCreateOpen(true);
      return;
    }
    if (tab === 'search') {
      setScreen('projects');
      setSearchKey((key) => key + 1);
      return;
    }
    setScreen(tab);
  };

  if (editing) {
    return (
      <>
        <EditorPage
          key={editing.id}
          initial={editing}
          onExit={() => setEditing(null)}
          onRequestMedia={(request) => setPicker(request)}
          onOpenHelp={() => setHelpOpen(true)}
        />
        {picker && <MediaPicker request={picker} onClose={() => setPicker(null)} />}
        {helpOpen && <AboutPage onBack={() => setHelpOpen(false)} />}
      </>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-white text-neutral-900">
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        {screen === 'projects' && (
          <ProjectsPage
            searchFocusKey={searchKey}
            onCreate={() => setCreateOpen(true)}
            onEdit={(project) => setEditing(project)}
          />
        )}
        {screen === 'cloud' && <CloudPage />}
        {screen === 'about' && <AboutPage />}
      </main>
      <BottomNav active={screen} onSelect={handleNav} />
      {createOpen && <CreatePage onClose={() => setCreateOpen(false)} onNewVideo={startNewVideo} />}
      {picker && <MediaPicker request={picker} onClose={() => setPicker(null)} />}
    </div>
  );
}
