import React, {lazy, Suspense} from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import {Poe1Layout} from "./Poe1Layout";

const Vendor = lazy(() => import("../pages/vendor/Vendor"));
const OptimizedMapMods = lazy(() => import("../pages/maps/OptimizedMapMods"));
const Boat = lazy(() => import("../pages/boat/Boat"));
const Item = lazy(() => import("../pages/item/Item"));
const MovedContent = lazy(() => import("../pages/moved/MovedContent"));
const Heist = lazy(() => import("../pages/heist/Heist"));
const Expedition = lazy(() => import("../pages/expedition/Expedition"));
const Beast = lazy(() => import("../pages/beast/Beast"));
const Scarabs = lazy(() => import("../pages/scarab/Scarabs"));
const Tattoo = lazy(() => import("../pages/tattoo/Tattoo"));
const Runegraft = lazy(() => import("../pages/runegraft/Runegraft"));
const Jewel = lazy(() => import("../pages/jewel/Jewel"));
const Favorites = lazy(() => import("../pages/favorites/Favorites"));
const Gems = lazy(() => import("../pages/gems/Gems"));

export const Poe1Routes = () => (
  <Suspense fallback={<div className="route-loading" role="status" aria-live="polite">Loading…</div>}>
    <Routes>
    <Route element={<Poe1Layout/>}>
      <Route index element={<Favorites/>}/>
      <Route path="favorites" element={<Favorites/>}/>
      <Route path="vendor" element={<Vendor/>}/>
      <Route path="gems" element={<Gems/>}/>
      <Route path="maps" element={<OptimizedMapMods/>}/>
      <Route path="boat" element={<Boat/>}/>
      <Route path="items" element={<Item/>}/>
      <Route path="flasks" element={
        <MovedContent title="[Moved] Flasks" newPath="/items" linkText="Items"
                      extraInfo="Under the item section, select the flask base you want to craft and then select mods."/>
      }/>
      <Route path="heist" element={<Heist/>}/>
      <Route path="expedition" element={<Expedition/>}/>
      <Route path="beast" element={<Beast/>}/>
      <Route path="scarab" element={<Scarabs/>}/>
      <Route path="tattoo" element={<Tattoo/>}/>
      <Route path="runegraft" element={<Runegraft/>}/>
      <Route path="jewel" element={<Jewel/>}/>
    </Route>

    <Route path="*" element={<Navigate to="/vendor" replace/>}/>
    </Routes>
  </Suspense>
);

export default Poe1Routes;
