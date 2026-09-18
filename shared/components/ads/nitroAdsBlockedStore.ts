// Remembers, per browser, that the ad script was found blocked, so the next
// page load can skip the slot straight away instead of reserving space and
// waiting for the signals again. The memory is only trusted for a day; after
// that the visitor is re-checked. A script that does load clears it at once.
//
// localStorage can be missing or throw (private mode, blocked storage), so
// every access is guarded and the store then behaves as if empty.

const KEY = "nitroAds.blockedAt";

/** How long a stored verdict is trusted before the visitor is re-checked. */
export const REVALIDATE_MS = 24 * 60 * 60 * 1000;

export const rememberBlocked = (now: number = Date.now()): void => {
  try {
    localStorage.setItem(KEY, String(now));
  } catch {
    // Nothing to do: the next load just detects again.
  }
};

export const forgetBlocked = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
};

export const wasBlockedRecently = (now: number = Date.now()): boolean => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return false;
    const at = Number(raw);
    return Number.isFinite(at) && now - at < REVALIDATE_MS;
  } catch {
    return false;
  }
};
