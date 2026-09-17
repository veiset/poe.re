import {useEffect, useState} from "react";

// Whether the NitroPay ad script is being blocked for this visitor.
//
// The detection snippet in poe2/index.html is NitroPay's own: it tries to load
// an image from s.nitropay.com and dispatches `np.blocking` after three
// failures. NitroPay's guidance for that event is to "perform whatever task is
// necessary such as re-adjusting your layout", which is what callers use this
// for. A slow network never trips it, because the image has to fail, not stall.
//
// The script loading (`nitroAds.loaded`) always wins over the image test: the
// pixel can fail ~750ms in while the async script is still on its way, or be
// caught by a list that lets the script itself through. Once the script has
// loaded the hook reports unblocked for the rest of the page load, whatever
// the pixel said.
const isBlocked = () => window.nitroAds?.loaded !== true && window.npDetect?.blocking === true;

export const useNitroAdsBlocked = (): boolean => {
  const [blocked, setBlocked] = useState(isBlocked);

  useEffect(() => {
    const sync = () => setBlocked(isBlocked());
    // Either event may have fired between the initial render and this effect.
    sync();
    document.addEventListener("np.blocking", sync);
    document.addEventListener("nitroAds.loaded", sync);
    return () => {
      document.removeEventListener("np.blocking", sync);
      document.removeEventListener("nitroAds.loaded", sync);
    };
  }, []);

  return blocked;
};

export default useNitroAdsBlocked;
