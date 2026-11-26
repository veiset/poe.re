import React, {Suspense, useEffect} from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import {lazyPages} from "@shared/core/lazyPages";
import {Poe2Layout} from "./Poe2Layout";

const {page, preload} = lazyPages();

const Poe2Vendor = page(async () => ({default: (await import("../pages/vendor/Vendor")).Vendor}));
const Poe2Waystone = page(async () => ({default: (await import("../pages/waystone/Waystone")).Waystone}));
const Poe2Tablet = page(async () => ({default: (await import("../pages/tablet/Tablet")).Tablet}));
const Poe2Relic = page(async () => ({default: (await import("../pages/relic/Relic")).Relic}));
const Poe2Item = page(async () => ({default: (await import("../pages/item/Item")).Item}));
const Share = page(() => import("../pages/share/Share"));
const Favorites = page(() => import("../pages/favorites/Favorites"));
const Privacy = page(async () => ({default: (await import("@shared/components/privacy/Privacy")).Privacy}));

export const Poe2Routes = () => {
  // Once the site has rendered, so a click on a page doesn't wait for its code
  useEffect(preload, []);
  return (
    <Suspense fallback={<div className="route-loading" role="status" aria-live="polite">Loading…</div>}>
      <Routes>
      <Route element={<Poe2Layout/>}>
        <Route index element={<Favorites/>}/>
        <Route path="favorites" element={<Favorites/>}/>
        <Route path="vendor" element={<Poe2Vendor/>}/>
        <Route path="waystone" element={<Poe2Waystone/>}/>
        <Route path="tablet" element={<Poe2Tablet/>}/>
        <Route path="relic" element={<Poe2Relic/>}/>
        <Route path="item" element={<Poe2Item/>}/>
        <Route path="share/:id" element={<Share/>}/>
        <Route path="privacy" element={<Privacy site="poe2.re"/>}/>
      </Route>

      <Route path="*" element={<Navigate to="/favorites" replace/>}/>
      </Routes>
    </Suspense>
  );
};

export default Poe2Routes;
