import type { ButtonHTMLAttributes } from 'react';

export function Chip({
  active = false,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-40 ${
        active ? 'bg-sky-500 text-white' : 'bg-white/10 text-neutral-200 hover:bg-white/15'
      } ${className}`}
      {...rest}
    />
  );
}

export function ActionButton({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' }) {
  const tone =
    variant === 'primary'
      ? 'bg-sky-500 text-white hover:bg-sky-400'
      : variant === 'danger'
        ? 'bg-red-500 text-white hover:bg-red-400'
        : 'bg-white/10 text-white hover:bg-white/15';
  return (
    <button
      type="button"
      className={`rounded-xl px-5 py-3 font-semibold transition active:scale-[0.98] disabled:opacity-40 ${tone} ${className}`}
      {...rest}
    />
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}

export function SliderRow({ label, value, min, max, step, display, onChange }: SliderRowProps) {
  return (
    <label className="block py-2">
      <span className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-neutral-400">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={Math.max(min, max)}
        step={step}
        value={Math.min(Math.max(value, min), Math.max(min, max))}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-sky-400"
      />
    </label>
  );
}
