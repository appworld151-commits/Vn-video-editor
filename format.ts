export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function formatSeconds(seconds: number): string {
  return Math.max(0, seconds).toFixed(2);
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function isRecent(iso: string, days = 7): boolean {
  return Date.now() - new Date(iso).getTime() < days * 24 * 60 * 60 * 1000;
}
