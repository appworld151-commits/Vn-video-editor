import type { AspectRatio, Clip, MediaAsset, MusicItem, Timeline } from '@/types';

export const MIN_CLIP_LENGTH = 0.2;
export const DEFAULT_IMAGE_HOLD = 3;
export const DEFAULT_OVERLAY_LENGTH = 3;
export const FREEZE_HOLD = 1.5;

export const ASPECT_RATIOS: Record<Exclude<AspectRatio, 'original'>, number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:3': 4 / 3,
};

export const FULL_CROP = { x: 0, y: 0, w: 1, h: 1 };

export function createId(): string {
  return crypto.randomUUID();
}

export function createTimeline(): Timeline {
  return { aspect: 'original', clips: [], music: [], texts: [], stickers: [] };
}

export function clipDuration(clip: Clip): number {
  if (clip.kind === 'video') {
    return Math.max(0, clip.srcEnd - clip.srcStart) / clip.speed;
  }
  return clip.hold;
}

export function clipStarts(clips: Clip[]): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (const clip of clips) {
    starts.push(acc);
    acc += clipDuration(clip);
  }
  return starts;
}

export function totalDuration(timeline: Timeline): number {
  return timeline.clips.reduce((sum, clip) => sum + clipDuration(clip), 0);
}

export function clipAt(timeline: Timeline, time: number): { clip: Clip; start: number; index: number } | null {
  const starts = clipStarts(timeline.clips);
  for (let i = 0; i < timeline.clips.length; i++) {
    const clip = timeline.clips[i];
    const start = starts[i];
    if (time >= start && time < start + clipDuration(clip)) {
      return { clip, start, index: i };
    }
  }
  return null;
}

export function clipById(timeline: Timeline, id: string): { clip: Clip; start: number; index: number } | null {
  const starts = clipStarts(timeline.clips);
  const index = timeline.clips.findIndex((clip) => clip.id === id);
  if (index < 0) return null;
  return { clip: timeline.clips[index], start: starts[index], index };
}

export function sourceTimeAt(clip: Clip, localTime: number): number {
  if (clip.kind !== 'video') return clip.srcStart;
  const offset = localTime * clip.speed;
  const time = clip.reverse ? clip.srcEnd - offset : clip.srcStart + offset;
  return Math.min(Math.max(time, clip.srcStart), clip.srcEnd);
}

export function createClipFromAsset(asset: MediaAsset): Clip {
  const base: Omit<Clip, 'kind' | 'srcStart' | 'srcEnd' | 'hold'> = {
    id: createId(),
    assetId: asset.id,
    speed: 1,
    reverse: false,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    filter: 'none',
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    temperature: 0,
    opacity: 1,
    blur: 0,
    crop: FULL_CROP,
    rotation: 0,
    mirror: false,
    scale: 1,
    posX: 0.5,
    posY: 0.5,
  };
  if (asset.kind === 'image') {
    return { ...base, kind: 'image', srcStart: 0, srcEnd: 0, hold: DEFAULT_IMAGE_HOLD };
  }
  return { ...base, kind: 'video', srcStart: 0, srcEnd: asset.duration, hold: 0 };
}

export function duplicateClip(clip: Clip): Clip {
  return { ...clip, id: createId() };
}

export function moveClip(clips: Clip[], fromIndex: number, toIndex: number): Clip[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= clips.length || toIndex >= clips.length) {
    return clips;
  }
  const next = [...clips];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function replaceClip(clips: Clip[], id: string, patch: Partial<Clip>): Clip[] {
  return clips.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip));
}

export function splitClip(clip: Clip, localTime: number): [Clip, Clip] | null {
  if (clip.kind === 'video') {
    const cut = sourceTimeAt(clip, localTime);
    const leftLength = localTime;
    const rightLength = clipDuration(clip) - localTime;
    if (leftLength < MIN_CLIP_LENGTH || rightLength < MIN_CLIP_LENGTH) return null;
    const left: Clip = clip.reverse
      ? { ...clip, id: createId(), srcStart: cut, srcEnd: clip.srcEnd }
      : { ...clip, id: createId(), srcStart: clip.srcStart, srcEnd: cut };
    const right: Clip = clip.reverse
      ? { ...clip, id: createId(), srcStart: clip.srcStart, srcEnd: cut }
      : { ...clip, id: createId(), srcStart: cut, srcEnd: clip.srcEnd };
    return [left, right];
  }
  if (localTime < MIN_CLIP_LENGTH || clip.hold - localTime < MIN_CLIP_LENGTH) return null;
  return [
    { ...clip, id: createId(), hold: localTime },
    { ...clip, id: createId(), hold: clip.hold - localTime },
  ];
}

export function splitTimelineAt(timeline: Timeline, time: number, clipId?: string): Timeline | null {
  const hit = clipId ? clipById(timeline, clipId) : clipAt(timeline, time);
  if (!hit) return null;
  const parts = splitClip(hit.clip, time - hit.start);
  if (!parts) return null;
  const clips = [...timeline.clips];
  clips.splice(hit.index, 1, ...parts);
  return { ...timeline, clips };
}

export function freezeFrameAt(timeline: Timeline, time: number): Timeline | null {
  const hit = clipAt(timeline, time);
  if (!hit || hit.clip.kind !== 'video') return null;
  const local = time - hit.start;
  const parts = splitClip(hit.clip, local);
  if (!parts) return null;
  const frame = sourceTimeAt(hit.clip, local);
  const freeze: Clip = {
    ...parts[0],
    id: createId(),
    kind: 'freeze',
    srcStart: frame,
    srcEnd: frame,
    hold: FREEZE_HOLD,
    speed: 1,
    reverse: false,
    volume: 0,
    fadeIn: 0,
    fadeOut: 0,
  };
  const clips = [...timeline.clips];
  clips.splice(hit.index, 1, parts[0], freeze, parts[1]);
  return { ...timeline, clips };
}

export function resolvedAspect(timeline: Timeline, assets: MediaAsset[]): number {
  if (timeline.aspect !== 'original') return ASPECT_RATIOS[timeline.aspect];
  const first = timeline.clips[0];
  const asset = first && assets.find((item) => item.id === first.assetId);
  if (!asset || !asset.width || !asset.height) return 16 / 9;
  const rotated = first.rotation === 90 || first.rotation === 270;
  return rotated ? asset.height / asset.width : asset.width / asset.height;
}

export function clampCut(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function splitMusicAt(item: MusicItem, localTime: number): [MusicItem, MusicItem] | null {
  if (localTime < MIN_CLIP_LENGTH || item.length - localTime < MIN_CLIP_LENGTH) return null;
  return [
    { ...item, id: createId(), length: localTime },
    { ...item, id: createId(), start: item.start + localTime, length: item.length - localTime, offset: item.offset + localTime },
  ];
}

export function trimMusic(item: MusicItem, asset: MediaAsset | undefined, newStart: number, newLength: number): MusicItem {
  const maxLen = asset ? asset.duration - newStart : newLength;
  const length = Math.min(Math.max(newLength, MIN_CLIP_LENGTH), maxLen || newLength);
  return { ...item, start: Math.max(0, newStart), length, offset: newStart };
}

export function musicAt(timeline: Timeline, time: number): { item: MusicItem; index: number; local: number } | null {
  for (let i = 0; i < timeline.music.length; i++) {
    const item = timeline.music[i];
    if (time >= item.start && time < item.start + item.length) {
      return { item, index: i, local: time - item.start };
    }
  }
  return null;
}
