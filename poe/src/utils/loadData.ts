import type {ItemBase, ItemRegex} from "@shared/typedefs/Item";
import type {BeastRegex} from "@shared/typedefs/poe1/BeastRegex";
import type {BoatModsRegex} from "@shared/typedefs/poe1/BoatMods";
import type {Expedition} from "@shared/typedefs/poe1/Expedition";
import type {MapModsRegex} from "@shared/typedefs/poe1/MapMods";
import type {Scarabs} from "@shared/typedefs/poe1/Scarabs";
import type {DivinationCardsRegex} from "@shared/typedefs/poe1/DivinationCards";
import type {GemsRegex} from "@shared/typedefs/poe1/Gems";
import type {Ultimatum} from "@shared/typedefs/poe1/Ultimatum";
import type {Language} from "@shared/typedefs/Language";
import type {TradeIds} from "@shared/typedefs/TradeIds";
import {createLanguageDataLoader} from "@shared/core/LanguageDataLoader";
import {fetchGeneratedFile} from "@shared/generatedData";
import {hasItem} from "@shared/core/item/RebaseItemSettings";
import type {Itembase} from "@shared/core/item/ItemBaseSelector";

function lazy<T>(load: () => Promise<T>): () => Promise<T> {
  let value: Promise<T> | null = null;
  return () => {
    if (!value) {
      value = load().catch((error) => {
        value = null;
        throw error;
      });
    }
    return value;
  };
}

const itemBasetypes = createLanguageDataLoader<Language, ItemBase[]>((language) =>
  fetchGeneratedFile<ItemBase[]>(`item/Generated.Basetypes.Item.${language}.min.json`),
);

const itemRegex = createLanguageDataLoader<Language, ItemRegex[]>((language) =>
  fetchGeneratedFile<ItemRegex[]>(`item/Generated.Item.${language}.min.json`),
);

// The boat mods are only generated in English: the boat leaves the game with the next patch
const boatMods = lazy(() => fetchGeneratedFile<BoatModsRegex>("boatmods/Generated.BoatMods.ENGLISH.min.json"));
const expedition = lazy(() => fetchGeneratedFile<Expedition>(`expedition/Generated.Expedition.min.json`));
const mapTradeIds = lazy(() => fetchGeneratedFile<TradeIds>("trade-ids/Generated.TradeIds.Map.min.json"));
const beastRegexes = createLanguageDataLoader<Language, BeastRegex>((language) =>
  fetchGeneratedFile<BeastRegex>(`beast/Generated.BeastRegex.${language}.min.json`),
);
const scarabData = createLanguageDataLoader<Language, Scarabs>((language) =>
  fetchGeneratedFile<Scarabs>(`scarabs/Generated.Scarabs.${language}.min.json`),
);
const divinationCards = createLanguageDataLoader<Language, DivinationCardsRegex>((language) =>
  fetchGeneratedFile<DivinationCardsRegex>(`divination-cards/Generated.DivinationCards.${language}.min.json`),
);
const mapMods = createLanguageDataLoader<Language, MapModsRegex>((language) =>
  fetchGeneratedFile<MapModsRegex>(`mapmods/Generated.Map.${language}.min.json`),
);
const gems = createLanguageDataLoader<Language, GemsRegex>((language) =>
  fetchGeneratedFile<GemsRegex>(`gems/Generated.Gems.${language}.min.json`),
);

const ultimatum = createLanguageDataLoader<Language, Ultimatum>((language) =>
  fetchGeneratedFile<Ultimatum>(`ultimatum/Generated.Ultimatum.${language}.min.json`),
);

export const loadItemBasetypes = (language: Language): Promise<ItemBase[]> => itemBasetypes(language);
export const loadItemRegex = (language: Language): Promise<ItemRegex[]> => itemRegex(language);

// Item settings saved before items were localized hold English names
export const itemSettingsLanguage = async (language: Language, itembase: Itembase | undefined): Promise<Language> =>
  hasItem(await loadItemBasetypes(language), itembase) ? language : "ENGLISH";

export const loadBeastRegex = (language: Language): Promise<BeastRegex> => beastRegexes(language);
export const loadBoatMods = (): Promise<BoatModsRegex> => boatMods();
export const loadExpedition = (): Promise<Expedition> => expedition();
export const loadMapTradeIds = (): Promise<TradeIds> => mapTradeIds();
export const loadScarabs = (language: Language): Promise<Scarabs> => scarabData(language);
export const loadDivinationCards = (language: Language): Promise<DivinationCardsRegex> => divinationCards(language);
export const loadMapMods = (language: Language): Promise<MapModsRegex> => mapMods(language);
export const loadUltimatum = (language: Language): Promise<Ultimatum> => ultimatum(language);
export function loadGems(language: Language = "ENGLISH"): Promise<GemsRegex> {
  return gems(language);
}
