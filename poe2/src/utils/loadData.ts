import type {ItemBase, ItemRegex} from "@poe2/types/generated/item";
import type {RelicRegex} from "@poe2/types/generated/relic";
import type {Token} from "@poe2/types/generated/tablet";
import {ParsedAffix, parseAffixToken} from "./parseAffixToken";
import type {RepoeLanguageKey} from "@poe/utils/Languages";
import {createLanguageDataLoader} from "@shared/core/LanguageDataLoader";

export type WaystoneAffix = ParsedAffix & { prefix: boolean };
export type TabletAffix = ParsedAffix;
export type TradeStatIdMap = Record<string, string>;

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

const basetypes = createLanguageDataLoader<RepoeLanguageKey, ItemBase[]>((language) =>
  fetchJson<ItemBase[]>(`${basePath}/item/Generated.Basetypes.Item.${language}.min.json`),
);
const itemRegexes = createLanguageDataLoader<RepoeLanguageKey, ItemRegex[]>((language) =>
  fetchJson<ItemRegex[]>(`${basePath}/item/Generated.Item.${language}.min.json`),
);

export function loadItemBasetypes(language: RepoeLanguageKey): Promise<ItemBase[]> {
  return basetypes(language);
}

export function loadItemRegex(language: RepoeLanguageKey): Promise<ItemRegex[]> {
  return itemRegexes(language);
}

async function loadAffixTokens(file: string): Promise<Token<{prefix: boolean}>[]> {
  const {tokens} = await fetchJson<{tokens: Token<{prefix: boolean}>[]}>(file);
  return tokens;
}

const tabletAffixes = createLanguageDataLoader<RepoeLanguageKey, TabletAffix[]>(async (language) => {
  const tokens = await loadAffixTokens(`${basePath}/tablet/Generated.Tablet.${language}.min.json`);
  return tokens.map((token, sourceIndex) => ({...parseAffixToken(token), sourceIndex})).sort((a, b) => a.name.localeCompare(b.name));
});

const waystoneAffixes = createLanguageDataLoader<RepoeLanguageKey, WaystoneAffix[]>(async (language) => {
  const tokens = await loadAffixTokens(`${basePath}/waystone/Generated.Waystone.${language}.min.json`);
  return tokens.map((token, sourceIndex) => ({...parseAffixToken(token), sourceIndex, prefix: token.options.prefix})).sort((a, b) => a.name.localeCompare(b.name));
});

export function loadTabletAffixes(language: RepoeLanguageKey): Promise<TabletAffix[]> {
  return tabletAffixes(language);
}

export function loadWaystoneAffixes(language: RepoeLanguageKey): Promise<WaystoneAffix[]> {
  return waystoneAffixes(language);
}

const relicRegexes = createLanguageDataLoader<RepoeLanguageKey, RelicRegex[]>((language) =>
  fetchJson<RelicRegex[]>(`${basePath}/relic/Generated.Relic.${language}.min.json`),
);

export function loadRelicRegex(language: RepoeLanguageKey): Promise<RelicRegex[]> {
  return relicRegexes(language);
}

async function loadTradeFile(file: string): Promise<TradeStatIdMap> {
  try {
    return await fetchJson<TradeStatIdMap>(file);
  } catch {
    return {};
  }
}

const waystoneTradeStatIds = lazy(() =>
  loadTradeFile(`${basePath}/trade/WaystoneTradeStatIds.json`),
);

const tabletTradeStatIds = lazy(() =>
  loadTradeFile(`${basePath}/trade/TabletTradeStatIds.json`),
);

export function loadWaystoneTradeStatIds(): Promise<TradeStatIdMap> {
  return waystoneTradeStatIds();
}

export function loadTabletTradeStatIds(): Promise<TradeStatIdMap> {
  return tabletTradeStatIds();
}
