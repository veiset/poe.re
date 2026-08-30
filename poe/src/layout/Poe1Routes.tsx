import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import {Poe1Layout} from "./Poe1Layout";

import Vendor from "../pages/vendor/Vendor";
import OptimizedMapMods from "../pages/maps/OptimizedMapMods";
import Boat from "../pages/boat/Boat";
import Item from "../pages/item/Item";
import MovedContent from "../pages/moved/MovedContent";
import Heist from "../pages/heist/Heist";
import Expedition from "../pages/expedition/Expedition";
import Beast from "../pages/beast/Beast";
import Scarabs from "../pages/scarab/Scarabs";
import Tattoo from "../pages/tattoo/Tattoo";
import Runegraft from "../pages/runegraft/Runegraft";
import Jewel from "../pages/jewel/Jewel";
import Favorites from "../pages/favorites/Favorites";

export const Poe1Routes = () => (
  <Routes>
    <Route element={<Poe1Layout/>}>
      <Route index element={<Navigate to="/vendor" replace/>}/>
      <Route path="favorites" element={<Favorites/>}/>
      <Route path="vendor" element={<Vendor/>}/>
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
);

export default Poe1Routes;
