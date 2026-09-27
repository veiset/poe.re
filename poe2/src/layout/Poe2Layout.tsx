import React, {useEffect, useState} from "react";
import {Outlet} from "react-router-dom";
import {Poe2ProfileContext} from "./Poe2ProfileContext";
import Poe2PageLinks from "./Poe2PageLinks";
import Poe2Footer from "./Poe2Footer";
import {ensureDefaultProfile, loadSettings, selectedProfile, updateSettings} from "../localStorage";
import type {RepoeLanguageKey} from "@poe/utils/Languages";
import {useRefreshFromInitialLoad, useRefreshOnFocus} from "@shared/core/RefreshOnFocus";
import {Poe2LeagueProvider} from "./Poe2LeagueContext";
import {FavoritesProvider} from "../FavoritesContext";
import "../poe2.css";

export const Poe2Layout = () => {
  const [currentProfile, setCurrentProfile] = useState(() => {
    ensureDefaultProfile();
    return selectedProfile();
  });
  const [language, setLanguageState] = useState<RepoeLanguageKey>(() => loadSettings(selectedProfile()).language);
  const setLanguage = (next: RepoeLanguageKey) => {
    updateSettings(currentProfile, (settings) => ({...settings, language: next}));
    setLanguageState(next);
  };
  useEffect(() => setLanguageState(loadSettings(currentProfile).language), [currentProfile]);

  useRefreshFromInitialLoad();
  useRefreshOnFocus();

  return (
    <Poe2ProfileContext.Provider value={{currentProfile, setCurrentProfile, language, setLanguage}}>
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
