const storageKey = "dynamic-import-recovery";

/**
 * Reload once when a Vite lazy chunk belongs to an older deployment. The new
 * document points at the current deployment's hashed assets. A URL-specific
 * marker prevents an unavailable chunk from causing a reload loop.
 */
export const recoverFromDynamicImportFailure = () => {
  window.addEventListener("vite:preloadError", (event) => {
    const error = (event as Event & {payload: unknown}).payload;
    const failedUrl = error instanceof Error ? error.message : String(error);
    if (sessionStorage.getItem(storageKey) === failedUrl) return;

    sessionStorage.setItem(storageKey, failedUrl);
    event.preventDefault();
    window.location.reload();
  });
};
