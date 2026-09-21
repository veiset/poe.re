import {useLocation} from "react-router-dom";
import NitroAd from "@shared/components/ads/NitroAd";
import type {NitroAdOptions} from "@shared/core/nitroAds";
import "./Poe2AdBanner.css";

const BANNER_ID = "ad-std-banner-nitro-001";

// Module constant: NitroAd keys the placement off the id, so this object must
// stay referentially stable across renders.
const BANNER_OPTIONS: NitroAdOptions = {
  height: 250,
  delayLoading: true,
  report: {
    enabled: true,
    icon: true,
    wording: "Report Ad",
    position: "bottom-right",
  },
};

// Rendered by Poe2Header, so it sits under the page title. Keyed by pathname so
// every navigation tears the placement down and creates a new one, which is
// what NitroPay asks single-page apps to do (removed, not hidden or reused).
export const Poe2AdBanner = () => {
  const {pathname} = useLocation();
  return <NitroAd key={pathname} id={BANNER_ID} options={BANNER_OPTIONS} className="poe2-ad-banner"/>;
};

export default Poe2AdBanner;
