import { useCallback, useState } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

const HISTORY_LIMIT = 100;

export function useHistory<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({ past: [], present: initial, future: [] });

  const update = useCallback((next: (current: T) => T) => {
    setState((s) => {
      const value = next(s.present);
      if (value === s.present) return s;
      return { past: [...s.past, s.present].slice(-HISTORY_LIMIT), present: value, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      const previous = s.past[s.past.length - 1];
      if (previous === undefined) return s;
      return { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      const next = s.future[0];
      if (next === undefined) return s;
      return { past: [...s.past, s.present], present: next, future: s.future.slice(1) };
    });
  }, []);

  return {
    present: state.present,
    update,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
