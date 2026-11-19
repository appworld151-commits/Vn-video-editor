import { createId } from '@/lib/timeline';
import type { MediaAsset } from '@/types';

const THUMB_WIDTH = 180;

export interface ImportedMedia {
  asset: MediaAsset;
  blob: Blob;
}

function waitFor(target: HTMLMediaElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      target.removeEventListener(event, done);
      target.removeEventListener('error', fail);
      resolve();
    };
    const fail = () => {
      target.removeEventListener(event, done);
      target.removeEventListener('error', fail);
      reject(new Error('This file could not be read'));
    };
    target.addEventListener(event, done);
    target.addEventListener('error', fail);
  });
}

function drawThumb(source: CanvasImageSource, width: number, height: number): string {
  const ratio = width && height ? height / width : 9 / 16;
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_WIDTH;
  canvas.height = Math.round(THUMB_WIDTH * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}

async function readVideo(url: string): Promise<Omit<MediaAsset, 'id' | 'name' | 'kind'>> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;
  await waitFor(video, 'loadedmetadata');
  if (!Number.isFinite(video.duration)) {
    video.currentTime = 1e9;
    await waitFor(video, 'durationchange');
    video.currentTime = 0;
    await waitFor(video, 'seeked');
  }
  const duration = video.duration;
  const width = video.videoWidth;
  const height = video.videoHeight;
  video.currentTime = Math.min(0.5, duration / 2);
  await waitFor(video, 'seeked');
  const thumb = drawThumb(video, width, height);
  return { duration, width, height, thumb };
}

async function readImage(url: string): Promise<Omit<MediaAsset, 'id' | 'name' | 'kind'>> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return {
    duration: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
    thumb: drawThumb(image, image.naturalWidth, image.naturalHeight),
  };
}

async function readAudio(url: string): Promise<Omit<MediaAsset, 'id' | 'name' | 'kind'>> {
  const audio = document.createElement('audio');
  audio.preload = 'metadata';
  audio.src = url;
  await waitFor(audio, 'loadedmetadata');
  return { duration: audio.duration, width: 0, height: 0, thumb: '' };
}

export async function importMediaFile(file: File): Promise<ImportedMedia> {
  const kind = file.type.startsWith('video/')
    ? 'video'
    : file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('audio/')
        ? 'audio'
        : null;
  if (!kind) throw new Error('Only video, photo or audio files can be imported');

  const url = URL.createObjectURL(file);
  try {
    const meta =
      kind === 'video' ? await readVideo(url) : kind === 'image' ? await readImage(url) : await readAudio(url);
    if (kind !== 'image' && !(meta.duration > 0)) throw new Error('This file has no playable length');
    return {
      asset: { id: createId(), name: file.name, kind, ...meta },
      blob: file,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
