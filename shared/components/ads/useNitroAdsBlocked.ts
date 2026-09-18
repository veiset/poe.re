import {useEffect, useState} from "react";

// Whether the NitroPay ad script is being blocked for this visitor.
//
// Two signals say "blocked":
// - `np.blocking`, from NitroPay's own detection (@shared/core/nitroAdsDetect):
//   an image on s.nitropay.com failed to load three times. NitroPay's guidance
//   for that event is to "perform whatever task is necessary such as
//   re-adjusting your layout", which is what callers use this for.
// - `nitroAds.failed`, from the loader tag's onerror in poe2/index.html: the
//   ad script itself failed to load. Catches lists that block the script but
//   let the probe image through.
//
// The script loading (`nitroAds.loaded`) always wins over both: the probe can
// fail ~750ms in while the async script is still on its way, or be caught by a
// list that lets the script itself through. Once the script has loaded the hook
// reports unblocked for the rest of the page load.
const isBlocked = () =>
  window.nitroAds?.loaded !== true &&
  (window.npDetect?.blocking === true || window.nitroAdsFailed === true);

const EVENTS = ["np.blocking", "nitroAds.failed", "nitroAds.loaded"] as const;

export const useNitroAdsBlocked = (): boolean => {
  const [blocked, setBlocked] = useState(isBlocked);

  useEffect(() => {
    const sync = () => setBlocked(isBlocked());
    // Any of the events may have fired between the initial render and this effect.
    sync();
    EVENTS.forEach((name) => document.addEventListener(name, sync));
    return () => EVENTS.forEach((name) => document.removeEventListener(name, sync));
  }, []);

  return blocked;
};

export default useNitroAdsBlocked;
