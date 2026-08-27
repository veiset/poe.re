import { Settings } from "../settings";
import { TradeStatIdMap } from "./loadData";
import { buildTradeUrl, challengeLeague, getLeagues } from "@shared/core/TradeUrlBuilder";
import {normalizePriceRange} from "@shared/core/PriceRange";

interface StatFilter {
  id: string;
  value?: { min: number };
}

const DELIRIOUS_STAT_ID = "enchant.stat_1715784068";

interface StatGroup {
  type: "and" | "not" | "count" | "if";
  filters: StatFilter[];
  value?: { min: number };
}

interface MapFilters {
  map_tier?: { min?: number; max?: number };
  map_iiq?: { min: number };
  map_iir?: { min: number };
  map_bonus?: { min: number };
  map_magic_monsters?: { min: number };
  map_rare_monsters?: { min: number };
}

interface TypeFilters {
  category?: { option: string };
  rarity?: { option: string };
}

interface MiscFilters {
  corrupted?: { option: "true" | "false" };
}

interface TradeQuery {
  query: {
    status: { option: string };
    type?: string;
    stats?: StatGroup[];
    filters: {
      map_filters?: { disabled: boolean; filters: MapFilters };
      type_filters?: { disabled: boolean; filters: TypeFilters };
      misc_filters?: { disabled: boolean; filters: MiscFilters };
      trade_filters?: {
        filters: {
          price: {
            option: "exalted" | "divine";
            min: number;
            max: number;
          };
        };
      };
    };
  };
  sort: { price: string };
}

function parseMin(
  value: string | number | undefined,
): { min: number } | undefined {
  const num = typeof value === "number" ? value : parseInt(value ?? "", 10);
  return !isNaN(num) && num > 0 ? { min: num } : undefined;
}

function idsToFilters(
  options: { id?: number; isSelected: boolean }[],
  lookup: TradeStatIdMap,
): StatFilter[] {
  return options
    .filter((o) => o.isSelected && o.id !== undefined)
    .map((o) => lookup[String(o.id)])
    .filter((statId): statId is string => Boolean(statId))
    .map((id) => ({ id }));
}

function buildWaystoneQuery(
  waystone: Settings["waystone"],
  lookup: TradeStatIdMap,
): TradeQuery {
  const stats: StatGroup[] = [];

  const wantedFilters = idsToFilters(waystone.modifier.wantedMods, lookup);
  if (wantedFilters.length > 0) {
    if (waystone.modifier.wantedModsSelectType === "all") {
      stats.push({ type: "and", filters: wantedFilters });
    } else {
      stats.push({ type: "count", filters: wantedFilters, value: { min: 1 } });
    }
  }

  const unwantedFilters = idsToFilters(waystone.modifier.unwantedMods, lookup);
  if (unwantedFilters.length > 0) {
    stats.push({ type: "not", filters: unwantedFilters });
  }

  if (waystone.state.delirious) {
    stats.push({
      type: "and",
      filters: [{ id: DELIRIOUS_STAT_ID }],
    });
  }

  const mapFilters: MapFilters = {};
  if (
    waystone.tier.min > 1 ||
    (waystone.tier.max > 0 && waystone.tier.max < 16)
  ) {
    mapFilters.map_tier = {
      ...(waystone.tier.min > 1 ? { min: waystone.tier.min } : {}),
      ...(waystone.tier.max > 0 && waystone.tier.max < 16
        ? { max: waystone.tier.max }
        : {}),
    };
  }
  const iiq = parseMin(waystone.itemQuantity);
  const iir = parseMin(waystone.itemRarity);
  const magicMon = parseMin(waystone.magicMonsters);
  const rareMon = parseMin(waystone.rareMonsters);
  const dropChance = parseMin(waystone.waystoneDropChance);
  if (iiq) mapFilters.map_iiq = iiq;
  if (iir) mapFilters.map_iir = iir;
  if (magicMon) mapFilters.map_magic_monsters = magicMon;
  if (rareMon) mapFilters.map_rare_monsters = rareMon;
  if (dropChance) mapFilters.map_bonus = dropChance;

  const typeFilters: TypeFilters = {
    category: { option: "map.waystone" },
    rarity: { option: "rare" },
  };

  const miscFilters: MiscFilters = {};
  if (waystone.state.corrupted && !waystone.state.uncorrupted) {
    miscFilters.corrupted = { option: "true" };
  } else if (waystone.state.uncorrupted && !waystone.state.corrupted) {
    miscFilters.corrupted = { option: "false" };
  }

  const query: TradeQuery = {
    query: {
      status: { option: "securable" },
      filters: {
        type_filters: { disabled: false, filters: typeFilters },
        ...(Object.keys(mapFilters).length > 0
          ? { map_filters: { disabled: false, filters: mapFilters } }
          : {}),
        ...(Object.keys(miscFilters).length > 0
          ? { misc_filters: { disabled: false, filters: miscFilters } }
          : {}),
      },
    },
    sort: { price: "asc" },
  };

  if (stats.length > 0) {
    query.query.stats = stats;
  }

  if (waystone.asyncPriceRange.tradeEnabled) {
    const priceRange = normalizePriceRange(
      waystone.asyncPriceRange.min,
      waystone.asyncPriceRange.max,
    );
    if (priceRange) {
      query.query.filters.trade_filters = {
        filters: {price: {option: waystone.asyncPriceRange.currency, ...priceRange}},
      };
    }
  }

  return query;
}

const TABLET_TYPE_BY_KEY: Record<string, string> = {
  breach: "Breach Precursor Tablet",
  delirium: "Delirium Precursor Tablet",
  irradiated: "Precursor Tablet",
  expedition: "Expedition Precursor Tablet",
  ritual: "Ritual Precursor Tablet",
  overseer: "Overseer Precursor Tablet",
};

function buildTabletQuery(
  tablet: Settings["tablet"],
  lookup: TradeStatIdMap,
): TradeQuery {
  const selectedTypes = Object.entries(tablet.type)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const typeFilters: TypeFilters = { category: { option: "map.tablet" } };
  if (tablet.rarity.magic && !tablet.rarity.normal) {
    typeFilters.rarity = { option: "magic" };
  } else if (tablet.rarity.normal && !tablet.rarity.magic) {
    typeFilters.rarity = { option: "normal" };
  }

  const stats: StatGroup[] = [];
  const affixFilters = idsToFilters(tablet.modifier.affixes, lookup);
  if (affixFilters.length > 0) {
    if (tablet.modifier.affixSelectType === "all") {
      stats.push({ type: "and", filters: affixFilters });
    } else {
      stats.push({ type: "count", filters: affixFilters, value: { min: 1 } });
    }
  }

  if (tablet.modifier.usesRemaining && tablet.modifier.numUsesRemaining > 0) {
    stats.push({
      type: "and",
      filters: [
        {
          id: "pseudo.pseudo_number_of_uses_remaining",
          value: { min: tablet.modifier.numUsesRemaining },
        },
      ],
    });
  }

  const query: TradeQuery = {
    query: {
      status: { option: "online" },
      filters: {
        type_filters: { disabled: false, filters: typeFilters },
      },
    },
    sort: { price: "asc" },
  };

  if (stats.length > 0) {
    query.query.stats = stats;
  }

  if (tablet.asyncPriceRange.tradeEnabled) {
    const priceRange = normalizePriceRange(
      tablet.asyncPriceRange.min,
      tablet.asyncPriceRange.max,
    );
    if (priceRange) {
      query.query.filters.trade_filters = {
        filters: {price: {option: tablet.asyncPriceRange.currency, ...priceRange}},
      };
    }
  }

  // The trade site only accepts a single base type. If the user picked exactly
  // one tablet type, narrow to it; otherwise leave the category-only filter.
  if (selectedTypes.length === 1) {
    query.query.type = TABLET_TYPE_BY_KEY[selectedTypes[0]];
  }

  return query;
}

function buildUrl(query: TradeQuery, league: string): string {
  return buildTradeUrl(query, league, "poe2");
}

const currentLeague = async () => challengeLeague(await getLeagues("poe2"));

export async function openWaystoneTradeSearch(
  settings: Settings,
  statIds: TradeStatIdMap,
): Promise<void> {
  const league = await currentLeague();
  const url = buildUrl(buildWaystoneQuery(settings.waystone, statIds), league);
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function openTabletTradeSearch(
  settings: Settings,
  statIds: TradeStatIdMap,
): Promise<void> {
  const league = await currentLeague();
  const url = buildUrl(buildTabletQuery(settings.tablet, statIds), league);
  window.open(url, "_blank", "noopener,noreferrer");
}
