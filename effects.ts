import type { Clip, FilterId } from '@/types';

export const FILTER_OPTIONS: { id: FilterId; label: string; css: string }[] = [
  { id: 'none', label: 'Original', css: '' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.25) saturate(1.2)' },
  { id: 'cool', label: 'Cool', css: 'hue-rotate(-15deg) saturate(1.1)' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.6) contrast(1.1)' },
  { id: 'bw', label: 'B&W', css: 'grayscale(1)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.5) contrast(0.9) brightness(1.05)' },
  { id: 'fade', label: 'Fade', css: 'contrast(0.85) brightness(1.1) saturate(0.8)' },
];

export const TEXT_COLORS = ['#ffffff', '#ffd60a', '#ff453a', '#30d158', '#0a84ff', '#000000'];

export function buildClipFilter(clip: Clip): string {
  const preset = FILTER_OPTIONS.find((option) => option.id === clip.filter)?.css ?? '';
  const adjust = [
    clip.brightness !== 0 ? `brightness(${(1 + clip.brightness / 100).toFixed(2)})` : '',
    clip.contrast !== 0 ? `contrast(${(1 + clip.contrast / 100).toFixed(2)})` : '',
    clip.saturation !== 0 ? `saturate(${(1 + clip.saturation / 100).toFixed(2)})` : '',
    clip.exposure !== 0 ? `brightness(${(1 + clip.exposure / 200).toFixed(2)})` : '',
    clip.temperature !== 0 ? `hue-rotate(${clip.temperature.toFixed(0)}deg)` : '',
    clip.blur > 0 ? `blur(${clip.blur.toFixed(1)}px)` : '',
  ].filter(Boolean);
  return [preset, ...adjust].filter(Boolean).join(' ') || 'none';
}
