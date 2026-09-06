import { StorageAdapter } from './StorageMigrationService';

export type StorageHealthCode = 'ok' | 'unavailable' | 'write_failed' | 'read_failed' | 'cleanup_failed';

export interface StorageHealthReport {
  ok: boolean;
  code: StorageHealthCode;
  detail?: string;
}

const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error);

/**
 * Verifies that the local storage used by Smoke Lab can actually persist a round trip.
 * The probe never touches behavioral data and is removed immediately.
 */
export class StorageHealthService {
  static check(storage?: StorageAdapter): StorageHealthReport {
    let target: StorageAdapter;
    try {
      target = storage ?? window.localStorage;
    } catch (error) {
      return { ok: false, code: 'unavailable', detail: messageOf(error) };
    }

    const key = `smokelab_storage_probe_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const value = 'ok';
    try {
      target.setItem(key, value);
    } catch (error) {
      return { ok: false, code: 'write_failed', detail: messageOf(error) };
    }

    try {
      if (target.getItem(key) !== value) {
        try { target.removeItem(key); } catch { /* best effort */ }
        return { ok: false, code: 'read_failed', detail: 'Storage probe could not be read back.' };
      }
    } catch (error) {
      try { target.removeItem(key); } catch { /* best effort */ }
      return { ok: false, code: 'read_failed', detail: messageOf(error) };
    }

    try {
      target.removeItem(key);
    } catch (error) {
      return { ok: false, code: 'cleanup_failed', detail: messageOf(error) };
    }

    return { ok: true, code: 'ok' };
  }
}
