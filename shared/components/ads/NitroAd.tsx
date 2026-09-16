import {useEffect, useRef} from "react";
import {useLocation} from "react-router-dom";
import type {NitroAdInstance, NitroAdOptions} from "@shared/core/nitroAds";
import "./NitroAd.css";

interface NitroAdProps {
  id: string;
  options: NitroAdOptions;
  className?: string;
}

/**
 * Renders one NitroPay placement.
 *
 * Mount this in the layout rather than in a page: the placement is created once
 * and refreshed through `onNavigate` on every route change, which is what
 * NitroPay asks single-page apps to do. Remounting it per page would tear the
 * slot down and rebuild it on each navigation instead.
 */
export const NitroAd = ({id, options, className = ""}: NitroAdProps) => {
  const {pathname} = useLocation();
  const ad = useRef<NitroAdInstance | null>(null);

  useEffect(() => {
    let cancelled = false;

    // The loader stub in index.html queues the call until the real script
    // arrives, so this is safe to run before the script has loaded. It can
    // still return the placement synchronously once it has.
    Promise.resolve(window.nitroAds?.createAd?.(id, options)).then((created) => {
      if (cancelled || !created) return;
      ad.current = Array.isArray(created) ? created[0] : created;
    });

    return () => {
      cancelled = true;
      // NitroPay cleans the placement up when its container leaves the DOM,
      // which React does for us on unmount.
      ad.current = null;
    };
    // The options object is a module constant at every call site; re-creating
    // the placement on each render would fight the ad script.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Null until the placement resolves, so the first render is a no-op and the
    // ad is not refreshed immediately after being created.
    ad.current?.onNavigate();
  }, [pathname]);

  return <div id={id} className={`nitro-ad ${className}`.trim()} style={{minHeight: options.height}}/>;
};

export default NitroAd;
