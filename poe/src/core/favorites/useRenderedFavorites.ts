import {useEffect, useMemo, useState} from "react";
import {generateMapModRegex} from "@poe/pages/maps/OptimizedMapOutput";
import {defaultSettings, MapSettings} from "@poe/utils/SavedSettings";
import {loadMapMods} from "@poe/utils/loadData";
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

/**
 * Keeps saved favorites immutable while presenting their language-dependent
 * output in the language currently selected by the profile.
 */
export const useRenderedFavorites = (favorites: FavoriteRecord[], language: RepoeLanguageKey): FavoriteRecord[] => {
  const [mapData, setMapData] = useState<{language: RepoeLanguageKey; data: Awaited<ReturnType<typeof loadMapMods>>}>();
  const languageDependentFavorites = favorites.filter(isRegexFavorite).filter((favorite) => favorite.languageDependent);
  const hasMapFavorites = languageDependentFavorites.some((favorite) => favorite.pageKey === "maps");

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

  return useMemo(() => {
    if (!mapData || mapData.language !== language) return favorites;
    return favorites.map((favorite) => {
      if (!isRegexFavorite(favorite) || !favorite.languageDependent) return favorite;
      if (favorite.pageKey === "maps" && mapData) {
        try {
          const settings = normalizeMapSettings(favorite.configuration);
          return {...favorite, regex: mapRegex(settings, language, mapData.data)};
        } catch {
          // Keep a malformed legacy favorite usable instead of breaking the
          // entire favorites view.
          return favorite;
        }
      }
      return favorite;
    });
  }, [favorites, language, mapData]);
};
