export type AspectRatio = 'original' | '16:9' | '9:16' | '1:1' | '4:3';
export type Rotation = 0 | 90 | 180 | 270;
export type CropPreset = 'free' | '1:1' | '4:3' | '16:9' | '9:16';
export type FilterId = 'none' | 'warm' | 'cool' | 'vivid' | 'bw' | 'vintage' | 'fade';
export type TextAlignment = 'left' | 'center' | 'right';
export type TextAlign = TextAlignment;

export interface MediaAsset {
  id: string;
  name: string;
  kind: 'video' | 'image' | 'audio';
  duration: number;
  width: number;
  height: number;
  thumb: string;
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Clip {
  id: string;
  assetId: string;
  kind: 'video' | 'image' | 'freeze';
  srcStart: number;
  srcEnd: number;
  hold: number;
  speed: number;
  reverse: boolean;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  filter: FilterId;
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  temperature: number;
  opacity: number;
  blur: number;
  crop: CropRect;
  rotation: Rotation;
  mirror: boolean;
  scale: number;
  posX: number;
  posY: number;
}

export interface MusicItem {
  id: string;
  assetId: string;
  start: number;
  length: number;
  offset: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
}

export interface TextItem {
  id: string;
  text: string;
  start: number;
  length: number;
  x: number;
  y: number;
  size: number;
  color: string;
  background: boolean;
  outline: boolean;
  align: TextAlignment;
  font: string;
  letterSpacing: number;
  lineHeight: number;
  opacity: number;
  animationIn: TextAnimation;
  animationOut: TextAnimation;
  blendMode: TextBlendMode;
  locked: boolean;
  stylePreset: string;
}

export type TextAnimation = 'none' | 'fade' | 'slide-up' | 'slide-down' | 'zoom' | 'typewriter';
export type TextBlendMode = 'normal' | 'overlay' | 'multiply' | 'screen';

export interface StickerItem {
  id: string;
  emoji: string | null;
  assetId: string | null;
  start: number;
  length: number;
  x: number;
  y: number;
  scale: number;
}

export interface Timeline {
  aspect: AspectRatio;
  clips: Clip[];
  music: MusicItem[];
  texts: TextItem[];
  stickers: StickerItem[];
}

export interface Project {
  id: string;
  name: string;
  folder: string;
  thumbnail: string | null;
  duration: number;
  updatedAt: string;
  timeline: Timeline;
  assets: MediaAsset[];
}

export type PickResult =
  | { type: 'media'; assets: MediaAsset[] }
  | { type: 'sticker'; emoji: string }
  | { type: 'subtitle' };

export interface PickerRequest {
  multi: boolean;
  kinds: MediaAsset['kind'][];
  onConfirm: (assets: MediaAsset[]) => void;
}

export type ExportQuality = '480p' | '720p' | '1080p' | '1440p' | '2160p';
export type ExportFps = 24 | 25 | 30 | 50 | 60;

export interface ExportOptions {
  quality: ExportQuality;
  fps: ExportFps;
  /** Target video bitrate in Mbps. When omitted, a preset for the quality is used. */
  bitrateMbps?: number;
  audioOnly?: boolean;
}
