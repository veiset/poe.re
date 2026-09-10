import type {ItemBase, ItemRegex} from "@poe/types/generated/item";
import type {BeastRegex} from "@poe/types/generated/beast";
import type {BoatModsRegex} from "@poe/types/generated/boatmods";
import type {Expedition} from "@poe/types/generated/expedition";
import type {Jewel} from "@poe/types/generated/jewel";
import type {MapModsRegex} from "@poe/types/generated/mapmods";
import type {Scarabs} from "@poe/types/generated/scarabs";
import type {GemsRegex} from "@poe/types/generated/gems";

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

const boatMods = lazy(() => fetchJson<BoatModsRegex>(`${basePath}/boatmods/Generated.BoatMods.ENGLISH.min.json`));
const expedition = lazy(() => fetchJson<Expedition>(`${basePath}/expedition/Generated.Expedition.min.json`));
const jewel = lazy(() => fetchJson<Jewel>(`${basePath}/jewel/Generated.Jewel.min.json`));
const beastRegexes = new Map<string, () => Promise<BeastRegex>>();
function beastRegexFor(language: string): () => Promise<BeastRegex> {
  let load = beastRegexes.get(language);
  if (!load) {
    load = lazy(() => fetchJson<BeastRegex>(`${basePath}/beast/Generated.BeastRegex.${language}.min.json`));
    beastRegexes.set(language, load);
  }
  return load;
}

const scarabData = new Map<string, () => Promise<Scarabs>>();
function scarabsFor(language: string): () => Promise<Scarabs> {
  let load = scarabData.get(language);
  if (!load) {
    load = lazy(() => fetchJson<Scarabs>(`${basePath}/scarabs/Generated.Scarabs.${language}.min.json`));
    scarabData.set(language, load);
  }
  return load;
}

const mapMods = new Map<string, () => Promise<MapModsRegex>>();
function mapModsFor(language: string): () => Promise<MapModsRegex> {
  let load = mapMods.get(language);
  if (!load) {
    load = lazy(() => fetchJson<MapModsRegex>(`${basePath}/mapmods/Generated.Map.${language}.min.json`));
    mapMods.set(language, load);
  }
  return load;
}
const gems = lazy(() =>
  fetchJson<GemsRegex>(`${basePath}/gems/Generated.Gems.ENGLISH.min.json`),
);

export function loadItemBasetypes(): Promise<ItemBase[]> {
  return itemBasetypes();
}

export function loadItemRegex(): Promise<ItemRegex[]> {
  return itemRegex();
}

export const loadBeastRegex = (language: string): Promise<BeastRegex> => beastRegexFor(language)();
export const loadBoatMods = (): Promise<BoatModsRegex> => boatMods();
export const loadExpedition = (): Promise<Expedition> => expedition();
export const loadJewel = (): Promise<Jewel> => jewel();
export const loadScarabs = (language: string): Promise<Scarabs> => scarabsFor(language)();
export const loadMapMods = (language: string): Promise<MapModsRegex> => mapModsFor(language)();
export function loadGems(): Promise<GemsRegex> {
  return gems();
}
