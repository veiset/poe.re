import {useEffect, useMemo, useState} from "react";
import {generateMapModRegex} from "@poe/pages/maps/OptimizedMapOutput";
import {defaultSettings, MapSettings} from "@poe/utils/SavedSettings";
import {loadMapMods} from "@poe/utils/loadData";
import {loadBoatMods} from "@poe/utils/loadData";
import {generateBoatModRegex} from "@poe/pages/boat/BoatOutput";
import type {BoatSettings} from "@poe/utils/SavedSettings";
import type {RepoeLanguageKey} from "@poe/utils/Languages";
import {merge} from "@shared/core/utils";
import {FavoriteRecord, isRegexFavorite} from "./FavoriteTypes";

const mapRegex = (settings: MapSettings, language: RepoeLanguageKey, data: Awaited<ReturnType<typeof loadMapMods>>) => {
  const generated = generateMapModRegex(settings, data, language);
  return settings.customText.enabled && settings.customText.value ? `${generated} ${settings.customText.value}` : generated;
};

const normalizeMapSettings = (configuration: unknown): MapSettings => {
  if (configuration === null || typeof configuration !== "object" || Array.isArray(configuration)) {
    return defaultSettings.map;
  }
  // JSON serialization drops undefined legacy fields before merging them with
  // the current defaults, preventing old snapshots from reaching generators.
  const stored = JSON.parse(JSON.stringify(configuration)) as Partial<MapSettings>;
  return merge(defaultSettings.map, stored);
};
const normalizeBoatSettings = (configuration: unknown): BoatSettings => {
  if (configuration === null || typeof configuration !== "object" || Array.isArray(configuration)) return defaultSettings.boat;
  return merge(defaultSettings.boat, JSON.parse(JSON.stringify(configuration)) as Partial<BoatSettings>);
};

/**
 * Keeps saved favorites immutable while presenting their language-dependent
 * output in the language currently selected by the profile.
 */
export const useRenderedFavorites = (favorites: FavoriteRecord[], language: RepoeLanguageKey): FavoriteRecord[] => {
  const [mapData, setMapData] = useState<{language: RepoeLanguageKey; data: Awaited<ReturnType<typeof loadMapMods>>}>();
  const [boatData, setBoatData] = useState<{language: RepoeLanguageKey; data: Awaited<ReturnType<typeof loadBoatMods>>}>();
  const languageDependentFavorites = favorites.filter(isRegexFavorite).filter((favorite) => favorite.languageDependent);
  const hasMapFavorites = languageDependentFavorites.some((favorite) => favorite.pageKey === "maps");
  const hasBoatFavorites = languageDependentFavorites.some((favorite) => favorite.pageKey === "boat");

  useEffect(() => {
    if (!hasMapFavorites) {
      setMapData(undefined);
      return;
    }
    let cancelled = false;
    loadMapMods(language).then((data) => {
      if (!cancelled) setMapData({language, data});
    }).catch(() => {
      if (!cancelled) setMapData(undefined);
    });
    return () => { cancelled = true; };
  }, [hasMapFavorites, language]);

  useEffect(() => {
    if (!hasBoatFavorites) { setBoatData(undefined); return; }
    let cancelled = false;
    loadBoatMods(language).then((data) => { if (!cancelled) setBoatData({language, data}); }).catch(() => { if (!cancelled) setBoatData(undefined); });
    return () => { cancelled = true; };
  }, [hasBoatFavorites, language]);

  return useMemo(() => {
    return favorites.map((favorite) => {
      if (!isRegexFavorite(favorite) || !favorite.languageDependent) return favorite;
      if (favorite.pageKey === "maps" && mapData?.language === language) {
        try {
          const settings = normalizeMapSettings(favorite.configuration);
          return {...favorite, regex: mapRegex(settings, language, mapData.data)};
        } catch {
          // Keep a malformed legacy favorite usable instead of breaking the
          // entire favorites view.
          return favorite;
        }
      }
      if (favorite.pageKey === "boat" && boatData?.language === language) {
        try {
          const settings = normalizeBoatSettings(favorite.configuration);
          const generated = generateBoatModRegex(settings.selectedGoodIds, settings.allGoodMods, boatData.data,
            settings.adjacentModifier.enabled && settings.adjacentModifier.include,
            settings.adjacentModifier.enabled && !settings.adjacentModifier.include,
            settings.selectedAreaRegexes);
          return {...favorite, regex: settings.customText.enabled && settings.customText.value ? `${generated} ${settings.customText.value}` : generated};
        } catch { return favorite; }
      }
      return favorite;
    });
  }, [favorites, language, mapData, boatData]);
};
