import {useEffect} from "react";
import "./NitroConsentLinks.css";

declare global {
  interface Window {
    nitroAds?: {loaded?: boolean};
    __uspapi?: (command: string, version: number) => void;
    __cmp?: (command: string) => void;
  }
}

// Both links are injected by the NitroPay ad script and only for visitors the
// respective law applies to: the CCPA opt-out for US state privacy regions, the
// consent link where a TCF consent string was collected. Everywhere else the
// containers stay empty and the row collapses.
// Append ?usp_debug=1 or ?gdpr_debug=1 to force them to render while testing.
const addConsentLinks = () => {
  window.__uspapi?.("addLink", 1);
  window.__cmp?.("addConsentLink");
};

export const NitroConsentLinks = ({className = ""}: {className?: string}) => {
  useEffect(() => {
    // The ad script is async, so the APIs may not exist yet on first render.
    if (window.nitroAds?.loaded) {
      addConsentLinks();
      return;
    }
    document.addEventListener("nitroAds.loaded", addConsentLinks);
    return () => document.removeEventListener("nitroAds.loaded", addConsentLinks);
  }, []);

  return (
    <span className={`nitro-consent-links ${className}`.trim()}>
      <span data-ccpa-link="1"/>
      <span id="ncmp-consent-link"/>
    </span>
  );
};

export default NitroConsentLinks;
