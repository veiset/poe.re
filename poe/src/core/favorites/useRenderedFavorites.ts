import {useEffect, useMemo, useState} from "react";
import {generateMapModRegex} from "@poe/pages/maps/OptimizedMapOutput";
import {defaultSettings, MapSettings} from "@poe/utils/SavedSettings";
import {itemSettingsLanguage, loadBoatMods, loadGems, loadItemBasetypes, loadItemRegex, loadMapMods} from "@poe/utils/loadData";
import {generateBoatModRegex} from "@poe/pages/boat/BoatOutput";
import {storedLanguage} from "@poe/utils/Languages";
import {generateGemsRegex, translateGemIds} from "@poe/pages/gems/GemsOutput";
import type {BoatSettings, GemsSettings} from "@poe/utils/SavedSettings";
import {merge} from "@shared/core/utils";
import {groupAffixes} from "@shared/core/item/GroupUtils";
import {generateMagicItemRegex, generateRareItemRegex} from "@shared/core/item/ItemOutput";
import {rebaseItemSettings} from "@shared/core/item/RebaseItemSettings";
import type {ItemCraftingSettings} from "@shared/types/Settings.types";
import {FavoriteRecord, isRegexFavorite} from "./FavoriteTypes";
import type {Language} from "@shared/typedefs/Language";

type ItemData = {
  sourceBases: Awaited<ReturnType<typeof loadItemBasetypes>>;
  targetBases: Awaited<ReturnType<typeof loadItemBasetypes>>;
  sourceRegex: Awaited<ReturnType<typeof loadItemRegex>>;
  targetRegex: Awaited<ReturnType<typeof loadItemRegex>>;
};

const mapRegex = (settings: MapSettings, language: Language, data: Awaited<ReturnType<typeof loadMapMods>>) => {
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
const normalizeGemsSettings = (configuration: unknown): GemsSettings => {
  if (configuration === null || typeof configuration !== "object" || Array.isArray(configuration)) return defaultSettings.gems;
  return merge(defaultSettings.gems, JSON.parse(JSON.stringify(configuration)) as Partial<GemsSettings>);
};
const normalizeItemSettings = (configuration: unknown): ItemCraftingSettings => {
  if (configuration === null || typeof configuration !== "object" || Array.isArray(configuration)) return defaultSettings.itemCrafting;
  return merge(defaultSettings.itemCrafting, JSON.parse(JSON.stringify(configuration)) as Partial<ItemCraftingSettings>);
};

/**
 * Keeps saved favorites immutable while presenting their language-dependent
 * output in the language currently selected by the profile.
 */
export const useRenderedFavorites = (favorites: FavoriteRecord[], language: Language): FavoriteRecord[] => {
  const [mapData, setMapData] = useState<{language: Language; data: Awaited<ReturnType<typeof loadMapMods>>}>();
  const [boatData, setBoatData] = useState<{language: Language; data: Awaited<ReturnType<typeof loadBoatMods>>}>();
  const [gemDataById, setGemDataById] = useState<Map<string, {source: Awaited<ReturnType<typeof loadGems>>; target: Awaited<ReturnType<typeof loadGems>>}>>();
  const languageDependentFavorites = favorites.filter(isRegexFavorite).filter((favorite) => favorite.languageDependent);
  const hasMapFavorites = languageDependentFavorites.some((favorite) => favorite.pageKey === "maps");
  const hasBoatFavorites = languageDependentFavorites.some((favorite) => favorite.pageKey === "boat");
  const gemFavorites = languageDependentFavorites.filter((favorite) => favorite.pageKey === "gems");
  const itemFavorites = languageDependentFavorites.filter((favorite) => favorite.pageKey === "items");
  const [itemDataById, setItemDataById] = useState<Map<string, ItemData>>();

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
    loadBoatMods().then((data) => { if (!cancelled) setBoatData({language, data}); }).catch(() => { if (!cancelled) setBoatData(undefined); });
    return () => { cancelled = true; };
  }, [hasBoatFavorites, language]);

  useEffect(() => {
    if (!gemFavorites.length) { setGemDataById(undefined); return; }
    let cancelled = false;
    Promise.all(gemFavorites.map(async (favorite) => {
      const [source, target] = await Promise.all([loadGems(storedLanguage(favorite.context.language)), loadGems(language)]);
      return [favorite.id, {source, target}] as const;
    })).then((entries) => { if (!cancelled) setGemDataById(new Map(entries)); })
      .catch(() => { if (!cancelled) setGemDataById(undefined); });
    return () => { cancelled = true; };
  }, [favorites, language]);

  useEffect(() => {
    if (!itemFavorites.length) { setItemDataById(undefined); return; }
    let cancelled = false;
    Promise.all(itemFavorites.map(async (favorite) => {
      const settings = normalizeItemSettings(favorite.configuration);
      const sourceLanguage = await itemSettingsLanguage(storedLanguage(favorite.context.language), settings.itembase);
      const [sourceBases, targetBases, sourceRegex, targetRegex] = await Promise.all([
        loadItemBasetypes(sourceLanguage), loadItemBasetypes(language), loadItemRegex(sourceLanguage), loadItemRegex(language),
      ]);
      return [favorite.id, {sourceBases, targetBases, sourceRegex, targetRegex}] as const;
    })).then((entries) => { if (!cancelled) setItemDataById(new Map(entries)); })
      .catch(() => { if (!cancelled) setItemDataById(undefined); });
    return () => { cancelled = true; };
  }, [favorites, language]);

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
      if (favorite.pageKey === "gems") {
        const data = gemDataById?.get(favorite.id);
        if (!data) return favorite;
        try {
          const settings = normalizeGemsSettings(favorite.configuration);
          const localizedSettings: GemsSettings = {
            ...settings,
            selected: translateGemIds(settings.selected, data.source, data.target),
          };
          return {...favorite, regex: generateGemsRegex(localizedSettings, data.target)};
        } catch { return favorite; }
      }
      if (favorite.pageKey === "items") {
        const data = itemDataById?.get(favorite.id);
        if (!data) return favorite;
        try {
          const {settings, basetypes} = rebaseItemSettings(normalizeItemSettings(favorite.configuration),
            data.sourceBases, data.targetBases, data.sourceRegex, data.targetRegex);
          if (!settings.itembase) return favorite;
          const generated = settings.itembase.rarity === "Rare"
            ? generateRareItemRegex(groupAffixes(data.targetRegex), settings)
            : generateMagicItemRegex(settings, basetypes, language === "ENGLISH");
          return {...favorite, regex: settings.customText.enabled && settings.customText.value ? `${generated} ${settings.customText.value}` : generated};
        } catch { return favorite; }
      }
      return favorite;
    });
  }, [favorites, language, mapData, boatData, gemDataById, itemDataById]);
};
