import React, {lazy, Suspense} from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import {Poe2Layout} from "./Poe2Layout";

const Poe2Vendor = lazy(async () => ({default: (await import("../pages/vendor/Vendor")).Vendor}));
const Poe2Waystone = lazy(async () => ({default: (await import("../pages/waystone/Waystone")).Waystone}));
const Poe2Tablet = lazy(async () => ({default: (await import("../pages/tablet/Tablet")).Tablet}));
const Poe2Relic = lazy(async () => ({default: (await import("../pages/relic/Relic")).Relic}));
const Poe2Item = lazy(async () => ({default: (await import("../pages/item/Item")).Item}));
const Favorites = lazy(() => import("../pages/favorites/Favorites"));
const Privacy = lazy(async () => ({default: (await import("../pages/privacy/Privacy")).Privacy}));

export const Poe2Routes = () => (
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
      <Route path="privacy" element={<Privacy/>}/>
    </Route>

    <Route path="*" element={<Navigate to="/favorites" replace/>}/>
    </Routes>
  </Suspense>
);

export default Poe2Routes;
