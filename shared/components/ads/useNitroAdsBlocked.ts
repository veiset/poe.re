import {useEffect, useRef, useState} from "react";
import {forgetBlocked, rememberBlocked, wasBlockedRecently} from "./nitroAdsBlockedStore";

// Whether the NitroPay ad script is being blocked for this visitor.
//
// Three signals say "blocked":
// - `np.blocking`, from NitroPay's own detection (@shared/core/nitroAdsDetect):
//   an image on s.nitropay.com failed to load three times. NitroPay's guidance
//   for that event is to "perform whatever task is necessary such as
//   re-adjusting your layout", which is what callers use this for.
// - `nitroAds.failed`, from the loader tag's onerror in poe2/index.html: the
//   ad script itself failed to load. Catches lists that block the script but
//   let the probe image through.
// - A deadline. Some blockers do not fail the requests but answer them with
//   stand-ins (an empty script, a 1x1 image), so neither of the above fires
//   and the script never reports loaded. If `nitroAds.loaded` has not
//   happened LOAD_DEADLINE_MS after navigation started, that is what happened.
//
// A verdict from any of them is remembered in localStorage for three hours (see
// nitroAdsBlockedStore), so the next page load reports blocked from the first
// render instead of showing the slot and waiting for the signals again.
//
// The script loading (`nitroAds.loaded`) always wins over all of it: the probe
// can fail ~750ms in while the async script is still on its way, a list can
// let the script through, a slow connection can miss the deadline, and the
// visitor may have turned the blocker off since yesterday. Once the script has
// loaded the hook reports unblocked for the rest of the page load, forgets the
// stored verdict, and callers put the slot back.
const LOAD_DEADLINE_MS = 6000;

const isLoaded = () => window.nitroAds?.loaded === true;

const hasFreshSignal = (deadlinePassed: boolean) =>
  window.npDetect?.blocking === true || window.nitroAdsFailed === true || deadlinePassed;

const EVENTS = ["np.blocking", "nitroAds.failed", "nitroAds.loaded"] as const;

export const useNitroAdsBlocked = (): boolean => {
  // Read once: the stored verdict is a starting point, the live signals and
  // the script decide from there.
  const remembered = useRef(wasBlockedRecently());
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [blocked, setBlocked] = useState(() => !isLoaded() && (hasFreshSignal(false) || remembered.current));

  useEffect(() => {
    if (isLoaded()) return;
    // Measured from navigation start, not from mount, so a slow bundle does
    // not eat into the time the ad script gets.
    const remaining = Math.max(0, LOAD_DEADLINE_MS - performance.now());
    const timer = setTimeout(() => setDeadlinePassed(true), remaining);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sync = () => {
      if (isLoaded()) {
        forgetBlocked();
        setBlocked(false);
        return;
      }
      const fresh = hasFreshSignal(deadlinePassed);
      if (fresh) rememberBlocked();
      setBlocked(fresh || remembered.current);
    };
    // Any of the events may have fired between the initial render and this effect.
    sync();
    EVENTS.forEach((name) => document.addEventListener(name, sync));
    return () => EVENTS.forEach((name) => document.removeEventListener(name, sync));
  }, [deadlinePassed]);

  return blocked;
};

export default useNitroAdsBlocked;
