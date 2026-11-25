import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AppState,
  AvailabilityOverride,
  ManualAssignment,
} from '../types';
import { createSeedState } from '../data/seed';
import { generateRoster } from '../engine/scheduler';

const STORAGE_KEY = 'smart-roster:state:v2';
const LEGACY_STORAGE_KEY = 'smart-roster:state:v1';

function loadState(): AppState {
  const seed = createSeedState();
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...seed, ...parsed, baselineOverrides: parsed.baselineOverrides ?? [] };
  } catch {
    return seed;
  }
}

interface AppContextValue {
  state: AppState;
  patch: (patch: Partial<AppState>) => void;
  generate: (month?: string) => void;
  setCollection: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  simulateChange: (employeeId: string, startDate: string, endDate: string, reason: string) => void;
  revertChange: () => void;
  addManual: (assignment: ManualAssignment) => void;
  removeManual: (id: string) => void;
  addOverride: (override: AvailabilityOverride) => void;
  removeOverride: (id: string) => void;
  reset: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private mode / quota); the app still works in memory.
    }
  }, [state]);

  const value = useMemo<AppContextValue>(() => {
    const regenerate = (next: AppState) => {
      const roster = generateRoster({ ...next, month: next.rosterMonth });
      return { ...next, roster, baselineRoster: next.roster };
    };

    return {
      state,
      patch: (p) => setState((s) => ({ ...s, ...p })),
      generate: (month) =>
        setState((s) => {
          const target = month ?? s.rosterMonth;
          const next = { ...s, rosterMonth: target };
          return { ...next, baselineRoster: s.roster, roster: generateRoster({ ...next, month: target }) };
        }),
      setCollection: (key, items) =>
        setState((s) => {
          const next = { ...s, [key]: items } as AppState;
          return s.roster ? regenerate(next) : next;
        }),
      simulateChange: (employeeId, startDate, endDate, reason) =>
        setState((s) => {
          const dates: string[] = [];
          const cursor = new Date(`${startDate}T00:00:00`);
          const end = new Date(`${endDate}T00:00:00`);
          while (cursor <= end) {
            dates.push(
              `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
            );
            cursor.setDate(cursor.getDate() + 1);
          }
          const overrides = dates.map((date) => ({
            id: `chg-${employeeId}-${date}`,
            employeeId,
            date,
            type: 'UNAVAILABLE' as const,
            reason: reason || 'Availability change',
          }));
          const next = {
            ...s,
            baselineOverrides: s.overrides,
            overrides: [...s.overrides.filter((o) => !overrides.some((n) => n.employeeId === o.employeeId && n.date === o.date)), ...overrides],
          };
          return { ...next, baselineRoster: s.roster, roster: generateRoster({ ...next, month: next.rosterMonth }) };
        }),
      revertChange: () =>
        setState((s) => {
          const next = { ...s, overrides: s.baselineOverrides, baselineOverrides: [] };
          return { ...next, roster: s.baselineRoster, baselineRoster: null };
        }),
      addManual: (assignment) =>
        setState((s) => {
          const next = { ...s, manualAssignments: [...s.manualAssignments, assignment] };
          return { ...next, baselineRoster: s.roster, roster: generateRoster({ ...next, month: next.rosterMonth }) };
        }),
      removeManual: (id) =>
        setState((s) => {
          const next = { ...s, manualAssignments: s.manualAssignments.filter((m) => m.id !== id) };
          return { ...next, baselineRoster: s.roster, roster: generateRoster({ ...next, month: next.rosterMonth }) };
        }),
      addOverride: (override) =>
        setState((s) => {
          const next = { ...s, overrides: [...s.overrides.filter((o) => !(o.employeeId === override.employeeId && o.date === override.date)), override] };
          return { ...next, baselineRoster: s.roster, roster: generateRoster({ ...next, month: next.rosterMonth }) };
        }),
      removeOverride: (id) =>
        setState((s) => {
          const next = { ...s, overrides: s.overrides.filter((o) => o.id !== id) };
          return { ...next, baselineRoster: s.roster, roster: generateRoster({ ...next, month: next.rosterMonth }) };
        }),
      reset: () => setState(createSeedState()),
    };
  }, [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
