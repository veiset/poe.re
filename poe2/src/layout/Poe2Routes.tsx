import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import {Poe2Layout} from "./Poe2Layout";

import {Vendor as Poe2Vendor} from "../pages/vendor/Vendor";
import {Waystone as Poe2Waystone} from "../pages/waystone/Waystone";
import {Tablet as Poe2Tablet} from "../pages/tablet/Tablet";
import {Relic as Poe2Relic} from "../pages/relic/Relic";
import {Item as Poe2Item} from "../pages/item/Item";
import Favorites from "../pages/favorites/Favorites";

export const Poe2Routes = () => (
  <Routes>
    <Route element={<Poe2Layout/>}>
      <Route index element={<Favorites/>}/>
      <Route path="favorites" element={<Favorites/>}/>
      <Route path="vendor" element={<Poe2Vendor/>}/>
      <Route path="waystone" element={<Poe2Waystone/>}/>
      <Route path="tablet" element={<Poe2Tablet/>}/>
      <Route path="relic" element={<Poe2Relic/>}/>
      <Route path="item" element={<Poe2Item/>}/>
    </Route>

    <Route path="*" element={<Navigate to="/favorites" replace/>}/>
  </Routes>
);

export default Poe2Routes;
