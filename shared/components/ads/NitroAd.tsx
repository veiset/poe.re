import {useEffect, useRef} from "react";
import {useLocation} from "react-router-dom";
import classNames from "classnames";
import type {NitroAdInstance, NitroAdOptions} from "@shared/core/nitroAds";
import {useNitroAdsBlocked} from "./useNitroAdsBlocked";
import {useNitroAdUnfilled} from "./useNitroAdUnfilled";
import "./NitroAd.css";

/** What `nitroAds.createAd` resolves to: one placement, a list, or nothing. */
type CreatedAd = NitroAdInstance | NitroAdInstance[] | null | undefined;

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
 *
 * When the ad script is found blocked (see useNitroAdsBlocked), the container
 * is removed from the DOM rather than hidden, so the reserved height does not
 * sit empty, and a one-line notice takes its place. NitroPay asks for
 * placements to be removed, not hidden. Should the script still load
 * afterwards, the container comes back and the placement is created then.
 *
 * If the script loads but nothing is ever rendered into the container (a
 * blocker that stops the bidders rather than the script, or a plain no-fill),
 * the reserved height is dropped while the container itself stays put.
 */
export const NitroAd = ({id, options, className = ""}: NitroAdProps) => {
  const {pathname} = useLocation();
  const blocked = useNitroAdsBlocked();
  const container = useRef<HTMLDivElement | null>(null);
  const unfilled = useNitroAdUnfilled(container);
  const ad = useRef<NitroAdInstance | null>(null);

  useEffect(() => {
    if (blocked) return;
    let cancelled = false;

    // The loader stub in index.html queues the call until the real script
    // arrives, so this is safe to run before the script has loaded. It can
    // still return the placement synchronously once it has, or throw
    // synchronously; the Promise constructor routes a throw to the catch
    // below, where Promise.resolve would let it escape the effect.
    new Promise<CreatedAd>((resolve) => resolve(window.nitroAds?.createAd?.(id, options)))
      .then((created) => {
        if (cancelled || !created) return;
        ad.current = Array.isArray(created) ? created[0] : created;
      })
      .catch((err: unknown) => {
        // An unknown or disabled placement id, or a blocked request once the
        // real script is in charge. Leave the ref null so onNavigate stays a
        // no-op; nothing else to do from here.
        console.warn(`NitroAd: could not create placement "${id}"`, err);
      });

    return () => {
      cancelled = true;
      // NitroPay cleans the placement up when its container leaves the DOM,
      // which React does for us on unmount.
      ad.current = null;
    };
    // `options` is deliberately not a dependency: it is a module constant at
    // every call site, and re-creating the placement on each render would
    // fight the ad script.
  }, [id, blocked]);

  useEffect(() => {
    // Null until the placement resolves, so the first render is a no-op and the
    // ad is not refreshed immediately after being created.
    ad.current?.onNavigate();
  }, [pathname]);

  if (blocked) {
    return (
      <p className={classNames("nitro-ad-blocked", className)}>
        Adblocker detected, minimizing ad space to make the user experience better.
      </p>
    );
  }

  return (
    <div
      id={id}
      ref={container}
      className={classNames("nitro-ad", className)}
      style={{minHeight: unfilled ? 0 : options.height}}
    />
  );
};

export default NitroAd;
