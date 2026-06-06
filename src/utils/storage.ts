// Modular persistence seam.
//
// Every feature that needs to remember data (mind-map canvas, craft-script
// drafts, creative scripts/folders) goes through a *repo* module, and every
// repo reads/writes through this single `storage` adapter — never through
// `localStorage` directly.
//
// To move a feature from local storage to a database later, you swap the
// adapter (or give that one repo its own async adapter). Call sites don't
// change. That's the whole point of routing everything through here.

export interface StorageAdapter {
  read<T>(key: string, fallback: T): T;
  write<T>(key: string, value: T): void;
  remove(key: string): void;
}

// Browser localStorage implementation. SSR-safe: no-ops on the server.
const localAdapter: StorageAdapter = {
  read<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  write<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota / serialization errors — ignore, persistence is best-effort
    }
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// Single swap point. Replace with a DB-backed adapter (or wrap per-repo) when
// moving a feature off local storage.
export const storage: StorageAdapter = localAdapter;
