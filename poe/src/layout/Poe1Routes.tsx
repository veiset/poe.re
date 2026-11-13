import React, {Suspense, useEffect} from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import {lazyPages} from "@shared/core/lazyPages";
import {Poe1Layout} from "./Poe1Layout";
import RemovedContent from "../pages/moved/RemovedContent";

const {page, preload} = lazyPages();

const PobCodesImport = page(() => import("../pages/import/PobCodesImport"));
const Vendor = page(() => import("../pages/vendor/Vendor"));
const OptimizedMapMods = page(() => import("../pages/maps/OptimizedMapMods"));
const Item = page(() => import("../pages/item/Item"));
const MovedContent = page(() => import("../pages/moved/MovedContent"));
const Heist = page(() => import("../pages/heist/Heist"));
const Beast = page(() => import("../pages/beast/Beast"));
const Tattoo = page(() => import("../pages/tattoo/Tattoo"));
const Runegraft = page(() => import("../pages/runegraft/Runegraft"));
const Favorites = page(() => import("../pages/favorites/Favorites"));
const Gems = page(() => import("../pages/gems/Gems"));
const Privacy = page(async () => ({default: (await import("@shared/components/privacy/Privacy")).Privacy}));

export const Poe1Routes = () => {
  // Once the site has rendered, so a click on a page doesn't wait for its code
  useEffect(preload, []);
  return (
    <Suspense fallback={<div className="route-loading" role="status" aria-live="polite">Loading…</div>}>
      <Routes>
      <Route element={<Poe1Layout/>}>
        <Route index element={<Favorites/>}/>
        <Route path="favorites" element={<Favorites/>}/>
        <Route path="vendor" element={<Vendor/>}/>
        <Route path="gems" element={<Gems/>}/>
        <Route path="import-pob-codes" element={<PobCodesImport/>}/>
        <Route path="maps" element={<OptimizedMapMods/>}/>
        <Route path="boat" element={
          <RemovedContent title="[Removed in 3.30] Boat" reason="The boat page is not available after patch 3.30."/>
        }/>
        <Route path="items" element={<Item/>}/>
        <Route path="flasks" element={
          <MovedContent title="[Moved] Flasks" newPath="/items" linkText="Items"
                        extraInfo="Under the item section, select the flask base you want to craft and then select mods."/>
        }/>
        <Route path="heist" element={<Heist/>}/>
        <Route path="expedition" element={
          <RemovedContent title="[Removed in 3.30] Gwennen" reason="You can no longer gamble for items with Gwennen."/>
        }/>
        <Route path="beast" element={<Beast/>}/>
        <Route path="scarab" element={
          <RemovedContent title="[Removed in 3.30] Scarabs" reason="Scarabs have been removed from the game and replaced by Threads."/>
        }/>
        <Route path="tattoo" element={<Tattoo/>}/>
        <Route path="runegraft" element={<Runegraft/>}/>
        <Route path="privacy" element={<Privacy site="poe.re"/>}/>
        <Route path="jewel" element={
          <MovedContent title="[Moved] Jewels" newPath="/items" linkText="Items"
                        extraInfo="Under the item section, select the jewel base you want to craft and then select mods."/>
        }/>
      </Route>

      <Route path="*" element={<Navigate to="/vendor" replace/>}/>
      </Routes>
    </Suspense>
  );
};

export default Poe1Routes;
