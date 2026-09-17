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

export const Poe2AdBanner = () => (
  <NitroAd id={BANNER_ID} options={BANNER_OPTIONS} className="poe2-ad-banner"/>
);

export default Poe2AdBanner;
