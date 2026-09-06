export const PWA_UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export interface PWAUpdateCheckContext {
  online: boolean;
  visibilityState: DocumentVisibilityState;
}

export const PWAReleasePolicy = {
  shouldCheckForUpdate(context: PWAUpdateCheckContext): boolean {
    return context.online && context.visibilityState === 'visible';
  },

  updateCheckIntervalMs(): number {
    return PWA_UPDATE_CHECK_INTERVAL_MS;
  },
};
