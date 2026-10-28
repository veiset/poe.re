import React, {useEffect, useState} from "react";
import {Outlet} from "react-router-dom";
import PageLinks from "./PageLinks";
import SiteFooter from "@shared/components/SiteFooter";
import {Poe1SideAdBanner} from "@shared/components/ads/banners/Poe1AdBanner";
import {ensureDefaultProfile, loadSettings, selectedProfile} from "@poe/utils/LocalStorage";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {useRefreshFromInitialLoad, useRefreshOnFocus} from "@shared/core/RefreshOnFocus";
import {LeagueProvider} from "@shared/core/LeagueContext";
import {FavoritesProvider} from "@poe/core/favorites/FavoritesContext";
import {GeneratedDataFileError} from "@shared/components/GeneratedData/GeneratedDataFileError";

export const Poe1Layout = () => {
  const [globalProfile, setGlobalProfile] = useState(() => {
    ensureDefaultProfile();
    return selectedProfile();
  });
  const [profile, setProfile] = useState(loadSettings(globalProfile));
  const [lang, setLang] = useState(profile.language);

  useRefreshFromInitialLoad();
  useRefreshOnFocus();

  useEffect(() => {
    console.log(`Loading profile: ${globalProfile}, lang: ${lang}`)
    const savedSettings = loadSettings(globalProfile);
    setProfile(savedSettings);
  }, [globalProfile, lang]);

  return (
    <ProfileContext.Provider value={{globalProfile, setGlobalProfile, lang, setLang}}>
      <LeagueProvider>
        <FavoritesProvider>
          <div className="content-height-wrapper">
            <div className="content-container">
              <div className="content-links">
                <PageLinks/>
                <Poe1SideAdBanner/>
              </div>
              <div className="content-main">
                <div className="content-left-gfx"/>
                <div className="content-main-area">
                  <div className="page-content" key={`poe1-${profile.name}`}>
                    <GeneratedDataFileError language={lang}/>
                    <Outlet/>
                  </div>
                </div>
                <div className="content-right-gfx"/>
              </div>
            </div>
            <SiteFooter/>
          </div>
        </FavoritesProvider>
      </LeagueProvider>
    </ProfileContext.Provider>
  );
};
