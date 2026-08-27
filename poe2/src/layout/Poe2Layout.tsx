import React, {useState} from "react";
import {Outlet} from "react-router-dom";
import {Poe2ProfileContext} from "./Poe2ProfileContext";
import Poe2PageLinks from "./Poe2PageLinks";
import {selectedProfile} from "../localStorage";
import CoffeeBanner from "@shared/components/banner/CoffeeBanner";
import {useRefreshFromInitialLoad, useRefreshOnFocus} from "@shared/core/RefreshOnFocus";
import {Poe2LeagueProvider} from "./Poe2LeagueContext";
import "../poe2.css";

export const Poe2Layout = () => {
  const [currentProfile, setCurrentProfile] = useState(() => selectedProfile());

  useRefreshFromInitialLoad();
  useRefreshOnFocus();

  return (
    <Poe2ProfileContext.Provider value={{currentProfile, setCurrentProfile}}>
      <Poe2LeagueProvider>
        <CoffeeBanner/>
        <div className="content-height-wrapper">
          <div className="content-container">
            <div className="content-links">
              <Poe2PageLinks/>
            </div>
            <div className="content-main">
              <div className="content-left-gfx"/>
              <div className="content-main-area">
                <div className="page-content" key={`poe2-${currentProfile}`}>
                  <Outlet/>
                </div>
              </div>
              <div className="content-right-gfx"/>
            </div>
          </div>
        </div>
      </Poe2LeagueProvider>
    </Poe2ProfileContext.Provider>
  );
};
