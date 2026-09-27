import type {ItemBase, ItemRegex} from "@poe/types/generated/item";
import type {BeastRegex} from "@poe/types/generated/beast";
import type {BoatModsRegex} from "@poe/types/generated/boatmods";
import type {Expedition} from "@poe/types/generated/expedition";
import type {Jewel} from "@poe/types/generated/jewel";
import type {MapModsRegex} from "@poe/types/generated/mapmods";
import type {Scarabs} from "@poe/types/generated/scarabs";
import type {GemsRegex} from "@poe/types/generated/gems";
import {createLanguageDataLoader} from "@shared/core/LanguageDataLoader";

const basePath = "/generated";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json() as T;
}

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

const itemBasetypes = lazy(() =>
  fetchJson<ItemBase[]>(`${basePath}/item/Generated.Basetypes.Item.min.json`),
);

const itemRegex = lazy(() =>
  fetchJson<ItemRegex[]>(`${basePath}/item/Generated.Item.min.json`),
);

const boatMods = createLanguageDataLoader<string, BoatModsRegex>((language) =>
  fetchJson<BoatModsRegex>(`${basePath}/boatmods/Generated.BoatMods.${language}.min.json`),
);
const expedition = lazy(() => fetchJson<Expedition>(`${basePath}/expedition/Generated.Expedition.min.json`));
const jewel = lazy(() => fetchJson<Jewel>(`${basePath}/jewel/Generated.Jewel.min.json`));
const beastRegexes = createLanguageDataLoader<string, BeastRegex>((language) =>
  fetchJson<BeastRegex>(`${basePath}/beast/Generated.BeastRegex.${language}.min.json`),
);
const scarabData = createLanguageDataLoader<string, Scarabs>((language) =>
  fetchJson<Scarabs>(`${basePath}/scarabs/Generated.Scarabs.${language}.min.json`),
);
const mapMods = createLanguageDataLoader<string, MapModsRegex>((language) =>
  fetchJson<MapModsRegex>(`${basePath}/mapmods/Generated.Map.${language}.min.json`),
);
const gems = lazy(() =>
  fetchJson<GemsRegex>(`${basePath}/gems/Generated.Gems.ENGLISH.min.json`),
);

export function loadItemBasetypes(): Promise<ItemBase[]> {
  return itemBasetypes();
}

export function loadItemRegex(): Promise<ItemRegex[]> {
  return itemRegex();
}

export const loadBeastRegex = (language: string): Promise<BeastRegex> => beastRegexes(language);
export const loadBoatMods = (language: string): Promise<BoatModsRegex> => boatMods(language);
export const loadExpedition = (): Promise<Expedition> => expedition();
export const loadJewel = (): Promise<Jewel> => jewel();
export const loadScarabs = (language: string): Promise<Scarabs> => scarabData(language);
export const loadMapMods = (language: string): Promise<MapModsRegex> => mapMods(language);
export function loadGems(): Promise<GemsRegex> {
  return gems();
}
