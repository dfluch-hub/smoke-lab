export type StorageOperation = 'read' | 'write' | 'remove';

export interface SmokeLabStorageErrorDetail {
  operation: StorageOperation;
  key: string;
  message: string;
}

const emitStorageError = (detail: SmokeLabStorageErrorDetail) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent<SmokeLabStorageErrorDetail>('smokelab:storage-error', { detail }));
  } catch {
    // Never let telemetry/UI notification make storage failure worse.
  }
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

export const safeStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    emitStorageError({ operation: 'read', key, message: errorMessage(error) });
    return null;
  }
};

export const safeStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    emitStorageError({ operation: 'write', key, message: errorMessage(error) });
    return false;
  }
};

export const safeStorageRemove = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    emitStorageError({ operation: 'remove', key, message: errorMessage(error) });
    return false;
  }
};
