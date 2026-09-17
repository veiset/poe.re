import {useEffect, useState} from "react";

// Whether the NitroPay ad script is being blocked for this visitor.
//
// The detection snippet in poe2/index.html is NitroPay's own: it tries to load
// an image from s.nitropay.com and dispatches `np.blocking` after three
// failures. NitroPay's guidance for that event is to "perform whatever task is
// necessary such as re-adjusting your layout", which is what callers use this
// for. A slow network never trips it, because the image has to fail, not stall.
//
// Blocking is treated as final for the page load. If the ad script did load
// (`nitroAds.loaded`), the image test is ignored: the script is what matters.
const isBlocked = () => !window.nitroAds?.loaded && window.npDetect?.blocking === true;

export const useNitroAdsBlocked = (): boolean => {
  const [blocked, setBlocked] = useState(isBlocked);

  useEffect(() => {
    if (blocked) return;
    const onBlocking = () => {
      if (isBlocked()) setBlocked(true);
    };
    // Covers the case where detection finished between the initial render
    // and this effect, so the event was missed.
    onBlocking();
    document.addEventListener("np.blocking", onBlocking);
    return () => document.removeEventListener("np.blocking", onBlocking);
  }, [blocked]);

  return blocked;
};

export default useNitroAdsBlocked;
