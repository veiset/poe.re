// NitroPay's ad-block detection, ported from
// https://nitropay.com/docs/detecting-ad-blocking-users/ with the same
// behaviour: probe an image on s.nitropay.com, and after three failures set
// `window.npDetect.blocking` and dispatch `np.blocking`. NitroPay says to embed
// it "anywhere on your page", so it runs from the app bundle rather than as an
// inline snippet in index.html.
//
// Only a failure trips it; a slow load never does. The event is what
// `useNitroAdsBlocked` listens for.

const PROBE_URL = "https://s.nitropay.com/1.gif?";
const ATTEMPTS = 3;
const RETRY_MS = 250;

export const installNitroAdsDetection = () => {
  if (typeof window === "undefined" || window.npDetect) return;

  const state = {blocking: false};
  window.npDetect = state;
  let failures = 0;

  const probe = () => {
    const img = new Image();
    img.onerror = () => {
      failures++;
      if (failures < ATTEMPTS) {
        setTimeout(probe, RETRY_MS);
        return;
      }
      state.blocking = true;
      document.dispatchEvent(new CustomEvent("np.blocking", {detail: {blocking: true}}));
    };
    img.onload = () => {
      state.blocking = false;
    };
    img.src = `${PROBE_URL}${Math.random()}&adslot=`;
  };

  probe();
};
