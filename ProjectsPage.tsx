import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clapperboard, Folder, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import IconButton from '@/components/IconButton';
import Sheet from '@/components/Sheet';
import { errorMessage, formatClock, formatDate } from '@/lib/format';
import {
  deleteProjectRow,
  fetchProject,
  listProjects,
  renameProjectRow,
  type ProjectSummary,
} from '@/lib/projectsApi';
import type { Project } from '@/types';

type MenuMode = 'menu' | 'rename' | 'delete';

interface ProjectsPageProps {
  searchFocusKey: number;
  onCreate: () => void;
  onEdit: (project: Project) => void;
}

export default function ProjectsPage({ searchFocusKey, onCreate, onEdit }: ProjectsPageProps) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ project: ProjectSummary; mode: MenuMode } | null>(null);
  const [draftName, setDraftName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setProjects(await listProjects());
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchFocusKey > 0) searchRef.current?.focus();
  }, [searchFocusKey]);

  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects ?? []) counts.set(project.folder, (counts.get(project.folder) ?? 0) + 1);
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [projects]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (projects ?? []).filter(
      (project) =>
        (!folder || project.folder === folder) && (!needle || project.name.toLowerCase().includes(needle)),
    );
  }, [projects, folder, query]);

  const openProject = async (summary: ProjectSummary) => {
    setOpeningId(summary.id);
    setLoadError(null);
    try {
      onEdit(await fetchProject(summary.id));
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setOpeningId(null);
    }
  };

  const openMenu = (project: ProjectSummary) => {
    setMenu({ project, mode: 'menu' });
    setDraftName(project.name);
    setActionError(null);
  };

  const closeMenu = () => {
    setMenu(null);
    setActionError(null);
  };

  const saveRename = async () => {
    if (!menu) return;
    const name = draftName.trim();
    if (!name) {
      setActionError('Please enter a project name');
      return;
    }
    setBusy(true);
    try {
      await renameProjectRow(menu.project.id, name);
      setProjects((list) => list?.map((p) => (p.id === menu.project.id ? { ...p, name } : p)) ?? null);
      closeMenu();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const removeProject = async () => {
    if (!menu) return;
    const id = menu.project.id;
    setBusy(true);
    try {
      await deleteProjectRow(id);
      setProjects((list) => list?.filter((p) => p.id !== id) ?? null);
      closeMenu();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-full flex-col pb-28">
      <header className="px-5 pt-6">
        <h1 className="text-3xl font-bold">Projects</h1>
        <label className="mt-4 flex h-11 items-center gap-2 rounded-full bg-neutral-100 px-4 text-neutral-500 focus-within:ring-2 focus-within:ring-sky-400">
          <Search size={18} />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-400"
          />
        </label>
      </header>

      {folders.length > 0 && (
        <section className="mt-6">
          <h2 className="px-5 text-base font-bold">Folders</h2>
          <div className="mt-2 flex gap-3 overflow-x-auto px-5 pb-1">
            {folders.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() => setFolder(folder === name ? null : name)}
                aria-pressed={folder === name}
                className={`flex w-24 shrink-0 flex-col items-center rounded-2xl p-2 transition active:scale-95 ${
                  folder === name ? 'bg-sky-50 ring-2 ring-sky-400' : 'hover:bg-neutral-50'
                }`}
              >
                <Folder size={64} className="fill-sky-300 stroke-sky-300" />
                <span className="mt-1 max-w-full truncate text-sm font-bold">{name}</span>
                <span className="text-xs text-neutral-500">{count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 flex items-center justify-between px-5">
        <h2 className="text-base font-bold">
          {folder ?? 'All'} ({visible.length})
        </h2>
        {folder && (
          <button type="button" onClick={() => setFolder(null)} className="text-sm font-medium text-sky-600">
            Show all
          </button>
        )}
      </div>

      {loadError && (
        <div className="mx-5 mt-3 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{loadError}</span>
          <button type="button" onClick={() => void load()} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {projects === null && !loadError && <p className="px-5 py-10 text-center text-sm text-neutral-500">Loading projects...</p>}

      {projects !== null && visible.length === 0 && (
        <p className="px-8 py-12 text-center text-sm text-neutral-500">
          {projects.length === 0
            ? 'No projects yet. Tap + to create your first video.'
            : 'No projects match your search.'}
        </p>
      )}

      <ul className="mt-2">
        {visible.map((project) => (
          <li key={project.id} className="flex items-center gap-2 px-5 py-3">
            <button
              type="button"
              onClick={() => void openProject(project)}
              disabled={openingId !== null}
              className="flex min-w-0 flex-1 items-center gap-3 text-left transition active:opacity-70 disabled:opacity-60"
            >
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                {project.thumbnail ? (
                  <img src={project.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-neutral-400">
                    <Clapperboard size={22} />
                  </span>
                )}
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[11px] tabular-nums text-white">
                  {formatClock(project.duration)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold">{project.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
                  <Folder size={14} className="shrink-0 fill-sky-300 stroke-sky-300" />
                  <span className="truncate">{project.folder}</span>
                  <span className="ml-auto shrink-0">{formatDate(project.updatedAt)}</span>
                </p>
              </div>
            </button>
            <IconButton label="Project options" onClick={() => openMenu(project)} className="text-neutral-500 hover:bg-neutral-100">
              <MoreHorizontal size={20} />
            </IconButton>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onCreate}
        aria-label="Create"
        className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-500 active:scale-95"
      >
        <Plus size={28} />
      </button>

      {menu && (
        <Sheet
          title={menu.mode === 'menu' ? menu.project.name : menu.mode === 'rename' ? 'Rename project' : 'Delete project'}
          onClose={closeMenu}
        >
          {menu.mode === 'menu' && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setMenu({ project: menu.project, mode: 'rename' })}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-left text-base font-medium hover:bg-neutral-100"
              >
                <Pencil size={20} />
                Rename
              </button>
              <button
                type="button"
                onClick={() => setMenu({ project: menu.project, mode: 'delete' })}
                className="flex items-center gap-3 rounded-xl px-4 py-4 text-left text-base font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 size={20} />
                Delete
              </button>
            </div>
          )}
          {menu.mode === 'rename' && (
            <div className="flex flex-col gap-3">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                maxLength={80}
                autoFocus
                className="h-12 rounded-xl border border-neutral-300 px-4 text-base outline-none focus:border-sky-500"
              />
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              <button
                type="button"
                onClick={() => void saveRename()}
                disabled={busy}
                className="h-12 rounded-xl bg-blue-600 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                Save name
              </button>
            </div>
          )}
          {menu.mode === 'delete' && (
            <div className="flex flex-col gap-3">
              <p className="text-neutral-600">This removes the project from the cloud. This cannot be undone.</p>
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              <button
                type="button"
                onClick={() => void removeProject()}
                disabled={busy}
                className="h-12 rounded-xl bg-red-600 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                Delete project
              </button>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
