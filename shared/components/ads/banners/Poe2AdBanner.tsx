import {useLocation} from "react-router-dom";
import NitroAd from "@shared/components/ads/NitroAd";
import type {NitroAdOptions} from "@shared/core/nitroAds";

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
  return <NitroAd key={pathname} id={BANNER_ID} options={BANNER_OPTIONS}/>;
};

const SIDE_BANNER_ID = "side-banner-nitro-poe2";

const SIDE_BANNER_OPTIONS: NitroAdOptions = {
  height: 600,
  sizes: [["160", "600"]],
  // Only where the menu is a column on the left (see layout.css).
  mediaQuery: "(min-width: 1901px)",
  delayLoading: true,
  report: {
    enabled: true,
    icon: true,
    wording: "Report Ad",
    position: "top-right",
  },
};

// Rendered by Poe2Layout under the menu, on screens wide enough for the menu
// column. Keyed by pathname like Poe2AdBanner.
export const Poe2SideAdBanner = () => {
  const {pathname} = useLocation();
  return (
    <div className="nitro-side-ad">
      <NitroAd key={pathname} id={SIDE_BANNER_ID} options={SIDE_BANNER_OPTIONS}/>
    </div>
  );
};

export default Poe2AdBanner;
