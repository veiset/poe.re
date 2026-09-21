import React, {useState} from "react";
import {Outlet} from "react-router-dom";
import {Poe2ProfileContext} from "./Poe2ProfileContext";
import Poe2PageLinks from "./Poe2PageLinks";
import Poe2Footer from "./Poe2Footer";
import {ensureDefaultProfile, selectedProfile} from "../localStorage";
import {useRefreshFromInitialLoad, useRefreshOnFocus} from "@shared/core/RefreshOnFocus";
import {Poe2LeagueProvider} from "./Poe2LeagueContext";
import {FavoritesProvider} from "../FavoritesContext";
import "../poe2.css";

export const Poe2Layout = () => {
  const [currentProfile, setCurrentProfile] = useState(() => {
    ensureDefaultProfile();
    return selectedProfile();
  });

  useRefreshFromInitialLoad();
  useRefreshOnFocus();

  return (
    <Poe2ProfileContext.Provider value={{currentProfile, setCurrentProfile}}>
      <FavoritesProvider>
        <Poe2LeagueProvider>
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
            <Poe2Footer/>
          </div>
        </Poe2LeagueProvider>
      </FavoritesProvider>
    </Poe2ProfileContext.Provider>
  );
};
