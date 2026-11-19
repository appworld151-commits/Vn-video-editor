import { buildClipFilter } from '@/lib/effects';
import { clipAt, clipDuration, sourceTimeAt, totalDuration, createTimeline } from '@/lib/timeline';
import type { Clip, ExportOptions, MediaAsset, MusicItem, Timeline } from '@/types';

export interface LoadedAsset {
  asset: MediaAsset;
  url: string;
}

type MediaNode = HTMLVideoElement | HTMLAudioElement | HTMLImageElement;

interface MediaEntry {
  asset: MediaAsset;
  url: string;
  el: MediaNode;
  gain: GainNode | null;
}

type Listener = (time: number, playing: boolean) => void;

interface RecordingSession {
  canvas: HTMLCanvasElement;
  recorder: MediaRecorder;
  onProgress: (ratio: number) => void;
}

const SHORT_SIDE: Record<ExportOptions['quality'], number> = { '480p': 480, '720p': 720, '1080p': 1080, '1440p': 1440, '2160p': 2160 };
const VIDEO_BITRATE: Record<ExportOptions['quality'], number> = { '480p': 2_500_000, '720p': 5_000_000, '1080p': 9_000_000, '1440p': 16_000_000, '2160p': 32_000_000 };
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];
const EMIT_INTERVAL_MS = 33;

export function outputSize(ratio: number, shortSide: number): { width: number; height: number } {
  const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  if (ratio >= 1) return { width: even(shortSide * ratio), height: even(shortSide) };
  return { width: even(shortSide), height: even(shortSide / ratio) };
}

const AUDIO_MIME_CANDIDATES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];

export function pickRecorderMime(audioOnly = false): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const list = audioOnly ? AUDIO_MIME_CANDIDATES : MIME_CANDIDATES;
  return list.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export class Player {
  private timeline: Timeline = createTimeline();
  private ratio = 16 / 9;
  private entries = new Map<string, MediaEntry>();
  private audioCtx: AudioContext | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private time = 0;
  private playing = false;
  private muted = false;
  private rafId = 0;
  private lastFrame = 0;
  private lastEmit = 0;
  private previewCanvas: HTMLCanvasElement | null = null;
  private recording: RecordingSession | null = null;
  private listeners = new Set<Listener>();

  constructor() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      this.audioCtx = new Ctor();
      this.streamDest = this.audioCtx.createMediaStreamDestination();
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.time, this.playing);
    return () => this.listeners.delete(listener);
  }

  getTime(): number {
    return this.time;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getDuration(): number {
    return totalDuration(this.timeline);
  }

  attachPreview(canvas: HTMLCanvasElement | null): void {
    this.previewCanvas = canvas;
    this.draw();
  }

  /** Renders the frame under the playhead at full quality and returns it as a PNG. */
  async captureFrame(quality: ExportOptions['quality'] = '1080p'): Promise<Blob> {
    const { width, height } = outputSize(this.ratio, SHORT_SIDE[quality]);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not capture this frame');
    this.renderFrame(ctx, width, height, this.time);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not capture this frame'))), 'image/png');
    });
  }

  snapshot(): string | null {
    return this.previewCanvas?.toDataURL('image/jpeg', 0.8) ?? null;
  }

  setLayout(ratio: number): void {
    this.ratio = ratio;
    this.draw();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.syncMedia(false);
  }

  setMedia(loaded: LoadedAsset[]): void {
    const wanted = new Set(loaded.map((item) => item.asset.id));
    for (const [id, entry] of this.entries) {
      if (!wanted.has(id)) this.disposeEntry(id, entry);
    }
    for (const item of loaded) {
      const existing = this.entries.get(item.asset.id);
      if (existing && existing.url === item.url) continue;
      if (existing) this.disposeEntry(item.asset.id, existing);
      this.entries.set(item.asset.id, this.createEntry(item));
    }
    this.draw();
  }

  setTimeline(timeline: Timeline): void {
    this.timeline = timeline;
    this.time = Math.min(this.time, this.getDuration());
    this.syncMedia(false);
    this.draw();
    this.emit(true);
  }

  seek(time: number): void {
    this.pause();
    this.time = Math.min(Math.max(time, 0), this.getDuration());
    this.syncMedia(true);
    this.draw();
    this.emit(true);
  }

  play(): void {
    if (this.playing || this.getDuration() <= 0) return;
    if (this.time >= this.getDuration()) this.time = 0;
    void this.audioCtx?.resume();
    this.playing = true;
    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
    this.emit(true);
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.rafId);
    this.syncMedia(false);
    this.emit(true);
  }

  togglePlay(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.playing = false;
    for (const [id, entry] of this.entries) this.disposeEntry(id, entry);
    this.listeners.clear();
    void this.audioCtx?.close();
    this.audioCtx = null;
  }

  async exportVideo(options: ExportOptions, onProgress: (ratio: number) => void): Promise<Blob> {
    const mime = pickRecorderMime(options.audioOnly);
    if (!mime || !this.streamDest) throw new Error('Exporting is not supported in this browser');
    if (this.getDuration() <= 0) throw new Error('Add a video to your project before exporting');
    if (this.recording) throw new Error('An export is already running');

    const { width, height } = outputSize(this.ratio, SHORT_SIDE[options.quality]);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const stream = options.audioOnly ? new MediaStream() : canvas.captureStream(options.fps);
    this.streamDest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    const bitrate = options.bitrateMbps
      ? Math.round(options.bitrateMbps * 1_000_000)
      : VIDEO_BITRATE[options.quality] * (options.fps >= 50 ? 1.5 : 1);
    const recorder = new MediaRecorder(
      stream,
      options.audioOnly ? { mimeType: mime, audioBitsPerSecond: 192_000 } : { mimeType: mime, videoBitsPerSecond: bitrate },
    );

    return new Promise<Blob>((resolve, reject) => {
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        this.recording = null;
        resolve(new Blob(chunks, { type: mime.split(';')[0] }));
      };
      recorder.onerror = () => {
        this.recording = null;
        this.pause();
        reject(new Error('The video could not be exported'));
      };
      this.recording = { canvas, recorder, onProgress };
      this.pause();
      this.time = 0;
      this.syncMedia(true);
      recorder.start(250);
      this.play();
    });
  }

  cancelExport(): void {
    if (!this.recording) return;
    this.pause();
    if (this.recording.recorder.state !== 'inactive') this.recording.recorder.stop();
  }

  private createEntry(item: LoadedAsset): MediaEntry {
    let el: MediaNode;
    if (item.asset.kind === 'image') {
      const image = new Image();
      image.src = item.url;
      el = image;
    } else {
      const media = item.asset.kind === 'video' ? document.createElement('video') : document.createElement('audio');
      media.preload = 'auto';
      media.src = item.url;
      if (media instanceof HTMLVideoElement) {
        media.playsInline = true;
        media.addEventListener('seeked', () => this.draw());
        media.addEventListener('loadeddata', () => this.draw());
      }
      el = media;
    }
    let gain: GainNode | null = null;
    if (this.audioCtx && this.streamDest && el instanceof HTMLMediaElement) {
      const source = this.audioCtx.createMediaElementSource(el);
      gain = this.audioCtx.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(this.audioCtx.destination);
      gain.connect(this.streamDest);
    }
    return { asset: item.asset, url: item.url, el, gain };
  }

  private disposeEntry(id: string, entry: MediaEntry): void {
    if (entry.el instanceof HTMLMediaElement) {
      entry.el.pause();
      entry.el.removeAttribute('src');
      entry.el.load();
    }
    entry.gain?.disconnect();
    this.entries.delete(id);
  }

  private tick = (now: number): void => {
    const elapsed = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    this.time += elapsed;
    const duration = this.getDuration();
    if (this.time >= duration) {
      this.time = duration;
      this.playing = false;
      this.syncMedia(false);
      this.draw();
      this.emit(true);
      if (this.recording) this.finishRecording();
      return;
    }
    this.syncMedia(false);
    this.draw();
    this.emit(false);
    this.rafId = requestAnimationFrame(this.tick);
  };

  private finishRecording(): void {
    if (this.recording?.recorder.state !== 'inactive') this.recording?.recorder.stop();
  }

  private emit(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastEmit < EMIT_INTERVAL_MS) return;
    this.lastEmit = now;
    this.listeners.forEach((listener) => listener(this.time, this.playing));
    if (this.recording) {
      const duration = this.getDuration();
      this.recording.onProgress(duration > 0 ? Math.min(this.time / duration, 1) : 0);
    }
  }

  private draw(): void {
    const preview = this.previewCanvas;
    if (preview) {
      const { width, height } = outputSize(this.ratio, 540);
      if (preview.width !== width) preview.width = width;
      if (preview.height !== height) preview.height = height;
      const ctx = preview.getContext('2d');
      if (ctx) this.renderFrame(ctx, width, height, this.time);
    }
    if (this.recording) {
      const canvas = this.recording.canvas;
      const ctx = canvas.getContext('2d');
      if (ctx) this.renderFrame(ctx, canvas.width, canvas.height, this.time);
    }
  }

  private renderFrame(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const hit = clipAt(this.timeline, time);
    if (hit) this.drawClip(ctx, width, height, hit.clip, time - hit.start);
    this.drawOverlays(ctx, width, height, time);
    ctx.restore();
  }

  private drawClip(ctx: CanvasRenderingContext2D, width: number, height: number, clip: Clip, local: number): void {
    const entry = this.entries.get(clip.assetId);
    if (!entry) return;
    const media = entry.el;
    const sw = media instanceof HTMLVideoElement ? media.videoWidth : media instanceof HTMLImageElement ? media.naturalWidth : 0;
    const sh = media instanceof HTMLVideoElement ? media.videoHeight : media instanceof HTMLImageElement ? media.naturalHeight : 0;
    if (!sw || !sh || media instanceof HTMLAudioElement) return;

    const cx = clip.crop.x * sw;
    const cy = clip.crop.y * sh;
    const cw = clip.crop.w * sw;
    const ch = clip.crop.h * sh;
    const quarter = clip.rotation === 90 || clip.rotation === 270;
    const footW = quarter ? ch : cw;
    const footH = quarter ? cw : ch;
    const scaleFit = Math.min(width / footW, height / footH);
    const scale = scaleFit * clip.scale;

    const length = clipDuration(clip);
    let alpha = clip.opacity;
    if (clip.fadeIn > 0) alpha = Math.min(alpha, local / clip.fadeIn);
    if (clip.fadeOut > 0) alpha = Math.min(alpha, Math.max(0, length - local) / clip.fadeOut);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.filter = buildClipFilter(clip);
    const centerX = clip.posX * width;
    const centerY = clip.posY * height;
    ctx.translate(centerX, centerY);
    ctx.scale(clip.mirror ? -1 : 1, 1);
    ctx.rotate((clip.rotation * Math.PI) / 180);
    ctx.drawImage(media, cx, cy, cw, ch, (-cw * scale) / 2, (-ch * scale) / 2, cw * scale, ch * scale);
    ctx.restore();
  }

  private drawOverlays(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    for (const text of this.timeline.texts) {
      if (time < text.start || time >= text.start + text.length) continue;
      const local = time - text.start;
      const remaining = text.length - local;
      const fontSize = text.size * height;
      const fontWeight = text.stylePreset === 'bold-white' ? '700' : '600';
      ctx.font = `${fontWeight} ${fontSize}px ${text.font}, system-ui, sans-serif`;
      ctx.textAlign = text.align;
      ctx.textBaseline = 'middle';
      ctx.globalCompositeOperation = text.blendMode === 'normal' ? 'source-over' : text.blendMode;
      ctx.letterSpacing = `${text.letterSpacing}px`;

      let alpha = text.opacity;
      let offsetY = 0;
      let scaleAnim = 1;
      if (text.animationIn !== 'none' && local < 0.5) {
        const t = Math.min(local / 0.5, 1);
        if (text.animationIn === 'fade') alpha *= t;
        else if (text.animationIn === 'slide-up') { alpha *= t; offsetY = (1 - t) * fontSize; }
        else if (text.animationIn === 'slide-down') { alpha *= t; offsetY = -(1 - t) * fontSize; }
        else if (text.animationIn === 'zoom') { alpha *= t; scaleAnim = 0.5 + t * 0.5; }
        else if (text.animationIn === 'typewriter') {
          const chars = Math.ceil(text.text.length * t);
          ctx.globalAlpha = 0;
        }
      }
      if (text.animationOut !== 'none' && remaining < 0.5) {
        const t = Math.min(remaining / 0.5, 1);
        if (text.animationOut === 'fade') alpha *= t;
        else if (text.animationOut === 'slide-up') { alpha *= t; offsetY = -(1 - t) * fontSize; }
        else if (text.animationOut === 'slide-down') { alpha *= t; offsetY = (1 - t) * fontSize; }
        else if (text.animationOut === 'zoom') { alpha *= t; scaleAnim = 0.5 + t * 0.5; }
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      const x = text.x * width;
      const y = text.y * height + offsetY;

      if (scaleAnim !== 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scaleAnim, scaleAnim);
        ctx.translate(-x, -y);
      }

      let displayText = text.text;
      if (text.animationIn === 'typewriter' && local < 0.5) {
        const t = Math.min(local / 0.5, 1);
        displayText = text.text.slice(0, Math.ceil(text.text.length * t));
      }

      if (text.background) {
        const metrics = ctx.measureText(displayText);
        const halfW = text.align === 'center' ? metrics.width / 2 : text.align === 'right' ? 0 : metrics.width / 2;
        const leftX = text.align === 'center' ? x - halfW : text.align === 'right' ? x - metrics.width : x;
        const padX = fontSize * 0.4;
        const padY = fontSize * 0.25;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(leftX - padX, y - fontSize / 2 - padY, metrics.width + padX * 2, fontSize + padY * 2);
      }
      if (text.outline) {
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = fontSize * 0.12;
        ctx.lineJoin = 'round';
        ctx.strokeText(displayText, x, y);
      }
      if (text.stylePreset === 'shadow') {
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = fontSize * 0.15;
        ctx.shadowOffsetY = fontSize * 0.05;
      }
      ctx.fillStyle = text.color;
      ctx.fillText(displayText, x, y);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      if (scaleAnim !== 1) ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.letterSpacing = '0px';
    }
    for (const sticker of this.timeline.stickers) {
      if (time < sticker.start || time >= sticker.start + sticker.length) continue;
      const x = sticker.x * width;
      const y = sticker.y * height;
      if (sticker.emoji) {
        const size = sticker.scale * height * 0.2;
        ctx.font = `${size}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker.emoji, x, y);
        continue;
      }
      const entry = sticker.assetId ? this.entries.get(sticker.assetId) : undefined;
      if (entry && entry.el instanceof HTMLImageElement && entry.el.naturalWidth) {
        const drawW = sticker.scale * width * 0.3;
        const drawH = (drawW * entry.el.naturalHeight) / entry.el.naturalWidth;
        ctx.drawImage(entry.el, x - drawW / 2, y - drawH / 2, drawW, drawH);
      }
    }
  }

  private fadeFactorMusic(item: MusicItem, local: number): number {
    let factor = 1;
    if (item.fadeIn > 0) factor = Math.min(factor, local / item.fadeIn);
    if (item.fadeOut > 0) factor = Math.min(factor, (item.length - local) / item.fadeOut);
    return Math.max(0, Math.min(1, factor));
  }

  private syncMedia(seek: boolean): void {
    const hit = clipAt(this.timeline, this.time);
    const activeVideo = hit && hit.clip.kind !== 'image' ? this.entries.get(hit.clip.assetId) : undefined;
    const videoEl = activeVideo && activeVideo.el instanceof HTMLVideoElement ? activeVideo.el : null;
    const clip = hit?.clip;

    for (const entry of this.entries.values()) {
      if (entry.el instanceof HTMLVideoElement && entry.el !== videoEl && !entry.el.paused) entry.el.pause();
      if (entry.gain) entry.gain.gain.value = 0;
    }

    if (hit && clip && videoEl) {
      const local = this.time - hit.start;
      const target = sourceTimeAt(clip, local);
      const forwardPlay = this.playing && clip.kind === 'video' && !clip.reverse;
      videoEl.playbackRate = Math.min(Math.max(clip.speed, 0.0625), 16);
      if (forwardPlay) {
        if (videoEl.paused) void videoEl.play().catch(() => undefined);
        if (Math.abs(videoEl.currentTime - target) > 0.3) videoEl.currentTime = target;
      } else {
        if (!videoEl.paused) videoEl.pause();
        const drift = Math.abs(videoEl.currentTime - target);
        if (!videoEl.seeking && (seek ? drift > 0.01 : drift > 0.05)) videoEl.currentTime = target;
      }
      const entry = activeVideo;
      if (entry?.gain) {
        const fade = this.fadeFactor(clip, local);
        entry.gain.gain.value = this.muted || clip.reverse || clip.kind !== 'video' ? 0 : clip.volume * fade;
      }
    }
    for (const music of this.timeline.music) {
      const entry = this.entries.get(music.assetId);
      if (!entry || !(entry.el instanceof HTMLAudioElement)) continue;
      const audio = entry.el;
      const active = this.time >= music.start && this.time < music.start + music.length;
      if (entry.gain) entry.gain.gain.value = active && !this.muted ? music.volume * this.fadeFactorMusic(music, this.time - music.start) : 0;
      if (!active) {
        if (!audio.paused) audio.pause();
        continue;
      }
      const target = music.offset + (this.time - music.start);
      if (this.playing) {
        if (audio.paused) void audio.play().catch(() => undefined);
        if (Math.abs(audio.currentTime - target) > 0.3) audio.currentTime = target;
      } else {
        if (!audio.paused) audio.pause();
        if (seek || Math.abs(audio.currentTime - target) > 0.05) audio.currentTime = target;
      }
    }
  }

  private fadeFactor(clip: Clip, local: number): number {
    const length = clipDuration(clip);
    let factor = 1;
    if (clip.fadeIn > 0) factor = Math.min(factor, local / clip.fadeIn);
    if (clip.fadeOut > 0) factor = Math.min(factor, (length - local) / clip.fadeOut);
    return Math.max(0, Math.min(1, factor));
  }
}
