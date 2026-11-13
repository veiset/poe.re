import { MapSettings } from "../utils/SavedSettings";
import { tradeSearchBase } from "@shared/core/TradeUrlBuilder";
import {normalizePriceRange} from "@shared/core/PriceRange";
import {MAP_TYPE_TRADE_FILTERS, MAP_TYPE_TRADE_STATS, selectedMapTypes} from "@poe/pages/maps/MapTypes";
import {loadMapTradeIds} from "@poe/utils/loadData";
import type {TradeIds} from "@shared/typedefs/TradeIds";

interface StatFilter {
  id: string;
  value?: { min: number };
}

interface StatGroup {
  type: "and" | "not" | "count" | "if";
  filters: StatFilter[];
  value?: { min: number };
}

export interface TradeSettings {
  badIds: number[];
  goodIds: number[];
  allGoodMods: boolean;
  quantity: string;
  packsize: string;
  itemRarity: string;
  currency: string;
  scarab: string;
  divination: string;
  regex: string;
  eightModOnly: boolean;
  excludeValdo: boolean;
  mapTypes: MapSettings["mapTypes"];
  mapDropChance: string;
  quality: Omit<MapSettings["quality"], "regular">;
  anyQuality: boolean;
  anyYield: boolean;
  asyncPriceRange: MapSettings["asyncPriceRange"];
  corrupted: {
    enabled: boolean;
    include: boolean;
  };
  unidentified: {
    enabled: boolean;
    include: boolean;
  };
}

interface TradeQuery {
  query: {
    status: { option: string };
    stats?: StatGroup[];
    filters: {
      map_filters: {
        disabled: boolean;
        filters: {
          map_tier: { min: number };
          map_bonus?: { min: number };
          map_packsize?: { min: number };
          map_iir?: { min: number };
          map_blighted?: { option: "true" | "false" };
          map_uberblighted?: { option: "true" | "false" };
        };
      };
      type_filters?: {
        disabled: boolean;
        filters: {
          rarity?: { option: string };
          category?: { option: string };
        };
      };
      misc_filters?: {
        disabled: boolean;
        filters: {
          corrupted?: { option: "true" | "false" };
          identified?: { option: "true" | "false" };
          foil_variation?: { option: "none" };
        };
      };
      trade_filters?: {
        filters: {
          price: {
            option: "chaos" | "divine";
            min: number;
            max: number;
          };
        };
      };
    };
  };
  sort: { price: string };
}

export interface TradeSearchResult {
  success: boolean;
  url: string;
  error?: string;
}

function toStatFilters(ids: number[], tradeIds: TradeIds): { id: string }[] {
  return ids
    .map((id) => tradeIds[id.toString()])
    .filter((statId): statId is string => statId !== undefined)
    .map((id) => ({ id }));
}

function parseMinFilter(value: string): { min: number } | undefined {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 ? { min: num } : undefined;
}

function parsePriceRange(settings: TradeSettings["asyncPriceRange"]) {
  const range = normalizePriceRange(settings.min, settings.max);
  return range ? {option: settings.currency, ...range} : undefined;
}

/** The trade query for the settings; tradeIds maps the map mods' ids to the trade API's stat ids. */
export function buildTradeQuery(settings: TradeSettings, tradeIds: TradeIds): TradeQuery {
  const query: TradeQuery = {
    query: {
      status: { option: "securable" },
      filters: {
        map_filters: {
          disabled: false,
          filters: {
            map_tier: { min: 16 },
          },
        },
        type_filters: {
          disabled: false,
          filters: {
            category: { option: "map" },
            rarity: { option: "nonunique" },
          },
        },
      },
    },
    sort: { price: "asc" },
  };

  const stats: StatGroup[] = [];

  const badFilters = toStatFilters(settings.badIds, tradeIds);
  if (badFilters.length > 0) {
    stats.push({ type: "not", filters: badFilters });
  }

  const goodFilters = toStatFilters(settings.goodIds, tradeIds);
  if (goodFilters.length > 0) {
    if (settings.allGoodMods) {
      stats.push({ type: "and", filters: goodFilters });
    } else {
      stats.push({ type: "count", filters: goodFilters, value: { min: 1 } });
    }
  }

  const andFilters: StatFilter[] = [];
  const yieldFilters: StatFilter[] = [];

  if (settings.eightModOnly) {
    andFilters.push({
      id: "pseudo.pseudo_number_of_affix_mods",
      value: { min: 8 },
    });
  }

  const mapDropMin = parseMinFilter(settings.mapDropChance);
  if (mapDropMin) {
    yieldFilters.push({
      id: "pseudo.pseudo_map_more_map_drops",
      value: mapDropMin,
    });
  }

  const currencyMin = parseMinFilter(settings.currency);
  if (currencyMin) {
    yieldFilters.push({
      id: "pseudo.pseudo_map_more_currency_drops",
      value: currencyMin,
    });
  }

  const scarabMin = parseMinFilter(settings.scarab);
  if (scarabMin) {
    yieldFilters.push({
      id: "pseudo.pseudo_map_more_scarab_drops",
      value: scarabMin,
    });
  }

  const divinationMin = parseMinFilter(settings.divination);
  if (divinationMin) {
    yieldFilters.push({
      id: "pseudo.pseudo_map_more_card_drops",
      value: divinationMin,
    });
  }

  const mapIiq = parseMinFilter(settings.quantity);
  const mapPacksize = parseMinFilter(settings.packsize);
  const mapIir = parseMinFilter(settings.itemRarity);
  if (settings.anyYield) {
    if (mapPacksize) yieldFilters.push({id: "pseudo.pseudo_map_pack_size", value: mapPacksize});
    if (mapIir) yieldFilters.push({id: "pseudo.pseudo_map_item_rarity", value: mapIir});
    if (yieldFilters.length > 1) stats.push({type: "count", filters: yieldFilters, value: {min: 1}});
    else if (yieldFilters.length === 1) andFilters.push(...yieldFilters);
  } else {
    andFilters.push(...yieldFilters);
  }

  const qualityFilters: StatFilter[] = [];
  const pushQuality = (raw: string, id: string) => {
    const min = parseMinFilter(raw);
    if (min) qualityFilters.push({ id, value: min });
  };

  pushQuality(settings.quality.currency, "pseudo.pseudo_map_quality_currency");
  pushQuality(settings.quality.divination, "pseudo.pseudo_map_quality_cards");
  pushQuality(settings.quality.scarab, "pseudo.pseudo_map_quality_scarabs");
  pushQuality(settings.quality.rarity, "pseudo.pseudo_map_quality_rarity");
  pushQuality(settings.quality.packSize, "pseudo.pseudo_map_quality_pack_size");

  if (qualityFilters.length > 0) {
    if (settings.anyQuality && qualityFilters.length > 1) {
      stats.push({
        type: "count",
        filters: qualityFilters,
        value: { min: 1 },
      });
    } else {
      andFilters.push(...qualityFilters);
    }
  }

  // Map types with an implicit stat: excluded ones are NOT-ed, included ones need any of them.
  // Blighted maps use map filters, which the trade site combines with AND.
  const mapTypeStats = (include: boolean) => selectedMapTypes(settings.mapTypes, include)
    .flatMap((type) => MAP_TYPE_TRADE_STATS[type] ?? [])
    .map((id) => ({ id }));
  const excludedMapTypes = mapTypeStats(false);
  if (excludedMapTypes.length > 0) {
    stats.push({ type: "not", filters: excludedMapTypes });
  }
  const includedMapTypes = mapTypeStats(true);
  if (includedMapTypes.length > 0) {
    stats.push({ type: "count", filters: includedMapTypes, value: { min: 1 } });
  }

  if (andFilters.length > 0) {
    stats.push({
      type: "and",
      filters: andFilters,
    });
  }

  if (stats.length > 0) {
    query.query.stats = stats;
  }

  // Atlas Drops has a map filter but no pseudo stat, so it's required even when any yield matches
  if (mapIiq) {
    query.query.filters.map_filters.filters.map_bonus = mapIiq;
  }
  if (!settings.anyYield && (mapPacksize || mapIir)) {
    query.query.filters.map_filters.filters = {
      ...query.query.filters.map_filters.filters,
      ...(mapPacksize && { map_packsize: mapPacksize }),
      ...(mapIir && { map_iir: mapIir }),
    };
  }

  for (const type of ["blighted", "blightRavaged"] as const) {
    const mapType = settings.mapTypes[type];
    if (mapType.enabled) {
      query.query.filters.map_filters.filters[MAP_TYPE_TRADE_FILTERS[type]] = { option: mapType.include ? "true" : "false" };
    }
  }

  if (
    settings.corrupted.enabled ||
    settings.unidentified.enabled ||
    settings.excludeValdo
  ) {
    query.query.filters.misc_filters = {
      disabled: false,
      filters: {
        ...(settings.corrupted.enabled && {
          corrupted: { option: settings.corrupted.include ? "true" : "false" },
        }),
        ...(settings.unidentified.enabled && {
          identified: {
            option: settings.unidentified.include ? "false" : "true",
          },
        }),
        ...(settings.excludeValdo && {
          foil_variation: { option: "none" },
        }),
      },
    };
  }

  if (settings.asyncPriceRange.tradeEnabled) {
    const price = parsePriceRange(settings.asyncPriceRange);
    if (price) {
      query.query.filters.trade_filters = {filters: {price}};
    }
  }

  return query;
}

export async function createTradeSearch(
  settings: TradeSettings,
  league: string,
): Promise<TradeSearchResult> {
  try {
    const query = buildTradeQuery(settings, await loadMapTradeIds());
    const encodedQuery = encodeURIComponent(JSON.stringify(query));
    const url = `${tradeSearchBase("poe1")}/${encodeURIComponent(league)}?q=${encodedQuery}`;

    return {
      success: true,
      url,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Trade search failed:", error);

    return {
      success: false,
      url: `${tradeSearchBase("poe1")}/${encodeURIComponent(league)}`,
      error: message,
    };
  }
}

export async function openTradeSearch(
  settings: TradeSettings,
  league: string,
): Promise<TradeSearchResult> {
  const result = await createTradeSearch(settings, league);
  window.open(result.url, "_blank", "noopener,noreferrer");
  return result;
}
