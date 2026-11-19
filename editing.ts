import { createClipFromAsset, createId, createTimeline } from '@/lib/timeline';
import type { CropRect, MediaAsset, Project } from '@/types';

export function createProject(assets: MediaAsset[]): Project {
  const timeline = { ...createTimeline(), clips: assets.map(createClipFromAsset) };
  const name = `Project ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  return {
    id: createId(),
    name,
    folder: 'Default',
    thumbnail: null,
    duration: 0,
    updatedAt: new Date().toISOString(),
    timeline,
    assets,
  };
}

export function mergeAssets(current: MediaAsset[], incoming: MediaAsset[]): MediaAsset[] {
  const known = new Set(current.map((asset) => asset.id));
  return [...current, ...incoming.filter((asset) => !known.has(asset.id))];
}

export function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((entry) => entry.id === item.id)
    ? list.map((entry) => (entry.id === item.id ? item : entry))
    : [...list, item];
}

export function cropForRatio(ratio: number, sourceWidth: number, sourceHeight: number): CropRect {
  const sourceRatio = sourceWidth / sourceHeight;
  if (sourceRatio > ratio) {
    const w = ratio / sourceRatio;
    return { x: (1 - w) / 2, y: 0, w, h: 1 };
  }
  const h = sourceRatio / ratio;
  return { x: 0, y: (1 - h) / 2, w: 1, h };
}

export function duplicateProjectData(project: Project): Project {
  return {
    ...project,
    id: createId(),
    name: `${project.name} copy`,
    updatedAt: new Date().toISOString(),
    thumbnail: project.thumbnail,
  };
}
