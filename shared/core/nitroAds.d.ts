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
  /** Clears and refreshes the placement; call it on every SPA route change. */
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
  }
}
