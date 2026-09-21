import {useEffect, useState, type RefObject} from "react";

// Extra time past NitroPay's own auction timeout before an empty container is
// treated as unfilled. Generous on purpose: a late fill into a collapsed slot
// shifts the page, an empty band that stays a few seconds longer does not.
const GRACE_MS = 5000;
const DEFAULT_AUCTION_TIMEOUT_MS = 3000;

// Whether the ad script loaded but never put anything into the container.
//
// This is the visitor whose blocker lets s.nitropay.com through and blocks
// the bidders instead, or a plain no-fill. NitroPay has no "no fill" event,
// so the container is inspected once the auction has had time to finish: if
// it still has no child element, the slot's reserved height can go. The
// container stays in the DOM because the script owns it and may still fill it
// on a later refresh; only the reservation is dropped.
export const useNitroAdUnfilled = (container: RefObject<HTMLElement | null>): boolean => {
  const [unfilled, setUnfilled] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let auctionTimeout = DEFAULT_AUCTION_TIMEOUT_MS;

    const check = () => {
      const el = container.current;
      if (el && el.childElementCount === 0) setUnfilled(true);
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(check, auctionTimeout + GRACE_MS);
    };
    const onLoaded = (event: DocumentEventMap["nitroAds.loaded"]) => {
      auctionTimeout = event.detail?.auctionTimeout ?? DEFAULT_AUCTION_TIMEOUT_MS;
      schedule();
    };
    const onRendered = () => {
      clearTimeout(timer);
      setUnfilled(false);
    };

    if (window.nitroAds?.loaded) schedule();
    document.addEventListener("nitroAds.loaded", onLoaded);
    document.addEventListener("nitroAds.rendered", onRendered);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("nitroAds.loaded", onLoaded);
      document.removeEventListener("nitroAds.rendered", onRendered);
    };
  }, [container]);

  return unfilled;
};

export default useNitroAdUnfilled;
