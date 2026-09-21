/**
 * Types for the NitroPay ad script loaded in poe2/index.html.
 *
 * The loader stub in that file defines `window.nitroAds` synchronously and
 * queues calls until the real script arrives, so `createAd` can be called
 * before the script has finished loading. The privacy APIs (`__uspapi`,
 * `__cmp`) only appear once it has, and only where the relevant law applies.
 */

export interface NitroAdOptions {
  height?: number;
  delayLoading?: boolean;
  report?: {
    enabled: boolean;
    icon: boolean;
    wording: string;
    position: string;
  };
}

export interface NitroAdInstance {
  /**
   * Clears and refreshes the placement in place. Not used here: NitroPay's
   * SPA guidance prefers tearing the element down and creating a new
   * placement per navigation, which NitroAd does by being remounted.
   */
  onNavigate: (href?: string) => void;
}

declare global {
  interface Window {
    nitroAds?: {
      loaded?: boolean;
      createAd?: (
        id: string,
        options: NitroAdOptions,
      ) => NitroAdInstance | Promise<NitroAdInstance | NitroAdInstance[]> | null;
    };
    __uspapi?: (command: string, version: number) => void;
    __cmp?: (command: string) => void;
    /** Set by NitroPay's ad-block detection, see @shared/core/nitroAdsDetect. */
    npDetect?: {blocking: boolean};
    /** Set by the loader tag's onerror in poe2/index.html when the ad script fails to load. */
    nitroAdsFailed?: boolean;
  }

  interface DocumentEventMap {
    /** Fired once by the ad script when it has fully loaded. */
    "nitroAds.loaded": CustomEvent<{
      acceptable?: boolean;
      /** How long the script waits for bids, in milliseconds. */
      auctionTimeout?: number;
      geo?: string;
      regionCode?: string;
    }>;
    /** Fired by the ad script when an ad has been rendered into a placement. */
    "nitroAds.rendered": CustomEvent<{type?: string}>;
    /** Fired by the detection in @shared/core/nitroAdsDetect when the ad script is being blocked. */
    "np.blocking": CustomEvent<{blocking: boolean}>;
    /** Fired by the loader tag's onerror in poe2/index.html when the ad script fails to load. */
    "nitroAds.failed": Event;
  }
}
