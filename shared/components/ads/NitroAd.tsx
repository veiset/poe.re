import {useEffect, useRef} from "react";
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
 * Renders one NitroPay placement for the lifetime of the mount.
 *
 * NitroPay asks single-page apps to tear the placement's element down and
 * create a new one on every navigation, removed rather than hidden or reused.
 * So the component creates the placement once on mount and does nothing on
 * later renders; the caller remounts it per route, for example with
 * `key={pathname}`. NitroPay cleans the placement up when its element leaves
 * the DOM, which React does on unmount.
 *
 * When the ad script is found blocked (see useNitroAdsBlocked), the container
 * is not rendered at all and a one-line notice takes its place. Should the
 * script still load afterwards, the container comes back and the placement is
 * created then.
 *
 * If the script loads but nothing is ever rendered into the container (a
 * blocker that stops the bidders rather than the script, or a plain no-fill),
 * the reserved height is dropped while the container itself stays put.
 */
export const NitroAd = ({id, options, className = ""}: NitroAdProps) => {
  const blocked = useNitroAdsBlocked();
  const container = useRef<HTMLDivElement | null>(null);
  const unfilled = useNitroAdUnfilled(container);

  useEffect(() => {
    if (blocked) return;
    let cancelled = false;

    // Deferred a microtask so an effect that React runs and immediately cleans
    // up (StrictMode in development does this on every mount) never reaches
    // the ad script; only the run that survives creates the placement.
    queueMicrotask(() => {
      if (cancelled) return;
      // The loader stub in index.html queues the call until the real script
      // arrives, so this is safe to run before the script has loaded. It can
      // still return the placement synchronously once it has, or throw
      // synchronously; the Promise constructor routes a throw to the catch
      // below, where Promise.resolve would let it escape.
      new Promise<CreatedAd>((resolve) => resolve(window.nitroAds?.createAd?.(id, options))).catch((err: unknown) => {
        // An unknown or disabled placement id, or a blocked request once the
        // real script is in charge. Nothing to do from here.
        console.warn(`NitroAd: could not create placement "${id}"`, err);
      });
    });

    return () => {
      cancelled = true;
    };
    // `options` is deliberately not a dependency: it is a module constant at
    // every call site, and re-creating the placement on each render would
    // fight the ad script.
  }, [id, blocked]);

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
