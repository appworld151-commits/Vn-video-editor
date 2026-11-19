import type { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export default function IconButton({ label, className = '', children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5 active:scale-95 disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
