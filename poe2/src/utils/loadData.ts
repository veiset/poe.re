import type {ItemBase, ItemRegex} from "@poe2/types/generated/item";
import type {RelicRegex} from "@poe2/types/generated/relic";
import type {Token} from "@poe2/types/generated/tablet";
import {ParsedAffix, parseAffixToken} from "./parseAffixToken";

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

const itemBasetypes = lazy(() =>
  fetchJson<ItemBase[]>(`${basePath}/item/Generated.Basetypes.Item.min.json`),
);

const itemRegex = lazy(() =>
  fetchJson<ItemRegex[]>(`${basePath}/item/Generated.Item.min.json`),
);

export function loadItemBasetypes(): Promise<ItemBase[]> {
  return itemBasetypes();
}

export function loadItemRegex(): Promise<ItemRegex[]> {
  return itemRegex();
}

async function loadAffixTokens(file: string): Promise<Token<{prefix: boolean}>[]> {
  const {tokens} = await fetchJson<{tokens: Token<{prefix: boolean}>[]}>(file);
  return tokens;
}

const tabletAffixes = lazy(async () => {
  const tokens = await loadAffixTokens(`${basePath}/tablet/Generated.Tablet.min.json`);
  return tokens.map(parseAffixToken).sort((a, b) => a.name.localeCompare(b.name));
});

const waystoneAffixes = lazy(async () => {
  const tokens = await loadAffixTokens(`${basePath}/waystone/Generated.Waystone.min.json`);
  return tokens
    .map((token) => ({...parseAffixToken(token), prefix: token.options.prefix}))
    .sort((a, b) => a.name.localeCompare(b.name));
});

export function loadTabletAffixes(): Promise<TabletAffix[]> {
  return tabletAffixes();
}

export function loadWaystoneAffixes(): Promise<WaystoneAffix[]> {
  return waystoneAffixes();
}

const relicRegex = lazy(() =>
  fetchJson<RelicRegex[]>(`${basePath}/relic/Generated.Relic.min.json`),
);

export function loadRelicRegex(): Promise<RelicRegex[]> {
  return relicRegex();
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
