import {defaultEmptyVendor, defaultSettings, GroupCondition, SelectOption, Settings, VendorGroup} from "../settings";
import {selectedOptionRegex} from "./SelectedOptionRegex";
import {generateRarityRegex, RaritySettings} from "./GenerateRarityRegex";
import {generateWaystoneRegex} from "../pages/waystone/WaystoneResult";
import {generateTabletRegex} from "../pages/tablet/TabletResult";
import {generateVendorRegex} from "../pages/vendor/VendorResult";
import {rebaseRelicSettings, rebaseTabletSettings, rebaseWaystoneSettings} from "../favoriteLanguageRenderer";
import {loadRelicRegex, loadTabletAffixes, loadWaystoneAffixes, TabletAffix, WaystoneAffix} from "./loadData";
import {GGPKLanguage} from "@poe/utils/Languages";
import {generatePriceRangeRegex, PriceCurrency} from "@poe/utils/regex/GeneratePriceRangeRegex";
import {generateNumberRegex} from "@shared/core/regex/GenerateNumberRegex";
import {
  parseMinNumberFromRegex,
  parseSafeDigitRange,
  RegexImportCandidate,
  RegexMetadataItem,
  RegexToken,
  splitTopLevelPipes,
  tokenizeRegex,
  unwrapOuterParens,
} from "@shared/core/regex/ParseRegex";
import type {RelicRegex} from "@shared/typedefs/poe2/Relic";
import type {Language} from "@shared/typedefs/Language";

export interface Poe2RegexCatalogs {
  waystoneAffixes?: WaystoneAffix[];
  tabletAffixes?: TabletAffix[];
  relicAffixes?: RelicRegex[];
}

const ALL_LANGUAGES = Object.keys(GGPKLanguage) as Language[];

const unquote = (s: string) =>
  s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;

function parseVerifiedPriceToken<TCurrency extends PriceCurrency>(
  token: RegexToken,
  allowedCurrencies: readonly TCurrency[],
): { min: string; max: string; currency: TCurrency } | null {
  if (token.negated) return null;
  const match = /^\\s(.+)\s+(chaos|divine|exalted)$/i.exec(token.value);
  if (!match) return null;
  const [, numPattern, rawCurrency] = match;
  const currency = rawCurrency.toLowerCase() as TCurrency;
  if (!allowedCurrencies.includes(currency)) return null;
  const range = parseSafeDigitRange(numPattern, 0, 999);
  if (!range) return null;
  const min = String(range.min);
  const max = String(range.max);
  return generatePriceRangeRegex(min, max, currency) === `"${token.value}"`
    ? {min, max, currency}
    : null;
}

interface AffixCatalogEntry {
  id?: number;
  name: string;
  regex: string;
  ranges: number[][];
}

function matchAffixSubTerm<T extends AffixCatalogEntry>(
  subTerm: string,
  catalog?: T[],
): { option: SelectOption; entry: T; round10: boolean } | null {
  if (!catalog || catalog.length === 0) return null;

  for (const entry of catalog) {
    if (!entry.ranges[0]) continue;
    if (!subTerm.startsWith(`${entry.regex}.*`) && !subTerm.endsWith(`.*${entry.regex}`)) continue;
    const [r0, r1] = entry.ranges[0];
    const lo = Math.max(0, Math.min(r0, r1));
    const hi = Math.min(999, Math.max(r0, r1));
    for (const round10 of [false, true]) {
      for (let v = lo; v <= hi; v++) {
        const option: SelectOption = {
          ...(entry.id !== undefined ? {id: entry.id} : {}),
          name: entry.name,
          regex: entry.regex,
          ranges: entry.ranges,
          isSelected: true,
          value: v,
        };
        if (selectedOptionRegex(option, round10) === subTerm) {
          return {option, entry, round10};
        }
      }
    }
  }

  for (const entry of catalog) {
    if (entry.regex === subTerm) {
      return {
        entry,
        round10: false,
        option: {
          ...(entry.id !== undefined ? {id: entry.id} : {}),
          name: entry.name,
          regex: entry.regex,
          ranges: entry.ranges,
          isSelected: true,
          value: null,
        },
      };
    }
  }

  return null;
}

let rarityLookup: Map<string, RaritySettings> | null = null;
function getRarityLookup(): Map<string, RaritySettings> {
  if (rarityLookup) return rarityLookup;
  rarityLookup = new Map();
  for (let mask = 1; mask < 7; mask++) {
    const rarity: RaritySettings = {
      normal: Boolean(mask & 1),
      magic: Boolean(mask & 2),
      rare: Boolean(mask & 4),
    };
    const out = generateRarityRegex(rarity);
    if (out) rarityLookup.set(unquote(out), rarity);
  }
  return rarityLookup;
}

type WaystoneQuantKey = "itemRarity" | "waystoneDropChance" | "monsterEffectiveness" | "monsterRarity" | "packSize";

let waystoneLookups: {
  tierMap: Map<string, { min: number; max: number }>;
  reviveMap: Map<string, { min: number; max: number }>;
  quantDefs: Array<{ key: WaystoneQuantKey; label: string; prefix: string }>;
} | null = null;

function getWaystoneLookups() {
  if (waystoneLookups) return waystoneLookups;
  const tierMap = new Map<string, { min: number; max: number }>();
  for (let min = 1; min <= 16; min++) {
    for (let max = min; max <= 16; max++) {
      const out = generateWaystoneRegex({
        ...defaultSettings,
        waystone: {...defaultSettings.waystone, tier: {min, max}},
      });
      if (out) tierMap.set(unquote(out), {min, max});
    }
  }
  const reviveMap = new Map<string, { min: number; max: number }>();
  for (let min = 0; min <= 6; min++) {
    for (let max = min; max <= 6; max++) {
      const out = generateWaystoneRegex({
        ...defaultSettings,
        waystone: {...defaultSettings.waystone, revives: {min, max}},
      });
      if (out) reviveMap.set(unquote(out), {min, max});
    }
  }
  const probeNumRegex = generateNumberRegex("10", false);
  const quantLabels: Array<[WaystoneQuantKey, string]> = [
    ["itemRarity", "Item rarity"],
    ["waystoneDropChance", "Waystone drop chance"],
    ["monsterEffectiveness", "Monster effectiveness"],
    ["monsterRarity", "Monster rarity"],
    ["packSize", "Pack size"],
  ];
  const quantDefs = quantLabels.map(([key, label]) => {
    const out = unquote(generateWaystoneRegex({
      ...defaultSettings,
      waystone: {...defaultSettings.waystone, [key]: "10"},
    }));
    const prefix = out.slice(0, out.length - probeNumRegex.length - 1);
    return {key, label, prefix};
  });

  waystoneLookups = {tierMap, reviveMap, quantDefs};
  return waystoneLookups;
}

export function parseWaystoneRegex(
  input: string,
  baseSettings: Settings,
  waystoneAffixes?: WaystoneAffix[],
): RegexImportCandidate<Settings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0) return null;

  const {tierMap, reviveMap, quantDefs} = getWaystoneLookups();
  const rarityMap = getRarityLookup();
  const waystone: Settings["waystone"] = {
    ...structuredClone(defaultSettings.waystone),
    resultSettings: {
      ...baseSettings.waystone.resultSettings,
      customText: "",
      customTextEnabled: false,
    },
  };

  let score = 0;
  let wantedTokensCount = 0;
  let pipeJoinedWanted = false;
  const leftoverTokens: string[] = [];
  const metadata: RegexMetadataItem[] = [];

  for (const token of tokens) {
    const price = parseVerifiedPriceToken(token, ["exalted", "divine"] as const);
    if (price) {
      waystone.asyncPriceRange = {...price, enabled: true, tradeEnabled: false};
      score += 3;
      metadata.push({label: "Price range", value: `${price.min}–${price.max} ${price.currency}`});
      continue;
    }

    if (!token.negated && token.value === "delir") {
      waystone.state.delirious = true;
      score += 4;
      metadata.push({label: "Delirious", value: "Yes"});
      continue;
    }
    if (token.value === "corr") {
      waystone.state.corrupted = !token.negated;
      waystone.state.uncorrupted = token.negated;
      score += 4;
      metadata.push({label: "State", value: token.negated ? "Uncorrupted" : "Corrupted"});
      continue;
    }

    if (!token.negated) {
      const rarity = rarityMap.get(token.value);
      if (rarity) {
        waystone.rarity = {...rarity};
        score += 2;
        const labels = [rarity.rare ? "Rare" : "", rarity.magic ? "Magic" : "", rarity.normal ? "Normal" : ""].filter(Boolean);
        metadata.push({label: "Rarity", value: labels.join(", ")});
        continue;
      }

      const tier = tierMap.get(token.value);
      if (tier) {
        waystone.tier = {...tier};
        score += 4;
        metadata.push({label: "Tier", value: `${tier.min}–${tier.max}`});
        continue;
      }

      const revives = reviveMap.get(token.value);
      if (revives) {
        waystone.revives = {...revives};
        score += 4;
        metadata.push({label: "Revives", value: `${revives.min}–${revives.max}`});
        continue;
      }

      if (token.value.endsWith("%")) {
        const qDef = quantDefs.find((d) => token.value.startsWith(d.prefix));
        if (qDef) {
          const parsed = parseMinNumberFromRegex(token.value.slice(qDef.prefix.length, -1));
          if (parsed) {
            waystone[qDef.key] = parsed.value;
            if (parsed.optimized) waystone.modifier.round10 = true;
            score += 4;
            metadata.push({label: qDef.label, value: `${parsed.value}%`});
            continue;
          }
        }
      }
    }

    const branches = splitTopLevelPipes(token.value);

    if (token.negated) {
      const matchedUnwanted: SelectOption[] = [];
      let allMatched = true;
      for (const subTerm of branches) {
        const modMatch = matchAffixSubTerm(subTerm, waystoneAffixes);
        if (!modMatch) { allMatched = false; break; }
        if (modMatch.round10) waystone.modifier.round10 = true;
        matchedUnwanted.push(modMatch.option);
      }
      if (allMatched && matchedUnwanted.length > 0) {
        for (const opt of matchedUnwanted) {
          if (!waystone.modifier.unwantedMods.some((m) => m.name === opt.name)) {
            waystone.modifier.unwantedMods.push(opt);
          }
        }
        score += matchedUnwanted.length * 3;
      } else {
        leftoverTokens.push(token.raw);
      }
      continue;
    }

    const matchedWanted: SelectOption[] = [];
    let allMatched = true;
    for (const subTerm of branches) {
      const modMatch = matchAffixSubTerm(subTerm, waystoneAffixes);
      if (!modMatch) { allMatched = false; break; }
      if (modMatch.round10) waystone.modifier.round10 = true;
      matchedWanted.push(modMatch.option);
    }
    if (allMatched && matchedWanted.length > 0) {
      for (const opt of matchedWanted) {
        if (!waystone.modifier.wantedMods.some((m) => m.name === opt.name)) {
          waystone.modifier.wantedMods.push(opt);
        }
      }
      wantedTokensCount++;
      if (branches.length > 1) pipeJoinedWanted = true;
      score += matchedWanted.length * 3;
    } else {
      leftoverTokens.push(token.raw);
    }
  }

  waystone.modifier.wantedModsSelectType = wantedTokensCount > 1 && !pipeJoinedWanted ? "all" : "any";

  if (waystone.modifier.unwantedMods.length > 0) {
    metadata.unshift({label: "Excluded mods", value: waystone.modifier.unwantedMods.length});
  }
  if (waystone.modifier.wantedMods.length > 0) {
    metadata.push({
      label: "Included mods",
      value: `${waystone.modifier.wantedMods.length} (${waystone.modifier.wantedModsSelectType === "all" ? "Match all" : "Match any"})`,
    });
  }

  if (score === 0) return null;

  if (leftoverTokens.length > 0) {
    waystone.resultSettings = {
      ...waystone.resultSettings,
      customText: leftoverTokens.join(" "),
      customTextEnabled: true,
    };
    metadata.push({label: "Custom text", value: waystone.resultSettings.customText});
  }

  return {
    pageKey: "waystone",
    pageLabel: "Waystones",
    route: "/waystone",
    score,
    metadata,
    settings: {...baseSettings, waystone},
  };
}

let tabletLookups: {
  typeCodeToKey: Map<string, keyof Settings["tablet"]["type"]>;
  usesMap: Map<string, number>;
} | null = null;

function getTabletLookups() {
  if (tabletLookups) return tabletLookups;
  const typeCodeToKey = new Map<string, keyof Settings["tablet"]["type"]>();
  for (const key of Object.keys(defaultSettings.tablet.type) as Array<keyof Settings["tablet"]["type"]>) {
    const out = generateTabletRegex({
      ...defaultSettings,
      tablet: {...defaultSettings.tablet, type: {...defaultSettings.tablet.type, [key]: true}},
    });
    if (out) typeCodeToKey.set(unwrapOuterParens(unquote(out)), key);
  }
  const usesMap = new Map<string, number>();
  for (let n = 1; n <= 18; n++) {
    const out = generateTabletRegex({
      ...defaultSettings,
      tablet: {...defaultSettings.tablet, modifier: {...defaultSettings.tablet.modifier, usesRemaining: true, numUsesRemaining: n}},
    });
    if (out) usesMap.set(unquote(out), n);
  }
  tabletLookups = {typeCodeToKey, usesMap};
  return tabletLookups;
}

export function parseTabletRegex(
  input: string,
  baseSettings: Settings,
  tabletAffixes?: TabletAffix[],
): RegexImportCandidate<Settings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0 || tokens.some((t) => t.negated)) return null;

  const {typeCodeToKey, usesMap} = getTabletLookups();
  const rarityMap = getRarityLookup();
  const tablet: Settings["tablet"] = {
    ...structuredClone(defaultSettings.tablet),
    resultSettings: {
      ...baseSettings.tablet.resultSettings,
      customText: "",
      customTextEnabled: false,
    },
  };

  let score = 0;
  let affixTokensCount = 0;
  let pipeJoinedAffixes = false;
  const leftoverTokens: string[] = [];
  const metadata: RegexMetadataItem[] = [];

  for (const token of tokens) {
    const price = parseVerifiedPriceToken(token, ["exalted", "divine"] as const);
    if (price) {
      tablet.asyncPriceRange = {...price, enabled: true, tradeEnabled: false};
      score += 3;
      metadata.push({label: "Price range", value: `${price.min}–${price.max} ${price.currency}`});
      continue;
    }

    const rarity = rarityMap.get(token.value);
    if (rarity) {
      tablet.rarity = {...rarity};
      score += 2;
      const labels = [rarity.rare ? "Rare" : "", rarity.magic ? "Magic" : "", rarity.normal ? "Normal" : ""].filter(Boolean);
      metadata.push({label: "Rarity", value: labels.join(", ")});
      continue;
    }

    const numUses = usesMap.get(token.value);
    if (numUses !== undefined) {
      tablet.modifier.usesRemaining = true;
      tablet.modifier.numUsesRemaining = numUses;
      score += 4;
      metadata.push({label: "Min uses remaining", value: numUses});
      continue;
    }

    const typeParts = unwrapOuterParens(token.value).split("|").filter(Boolean);
    if (
      (token.value.startsWith("(") || typeParts.length > 1 || !tabletAffixes?.some((a) => a.regex === token.value)) &&
      typeParts.length > 0 &&
      typeParts.every((p) => typeCodeToKey.has(p))
    ) {
      for (const part of typeParts) {
        tablet.type[typeCodeToKey.get(part)!] = true;
      }
      score += typeParts.length * 4;
      metadata.push({
        label: "Tablet types",
        value: typeParts.map((p) => typeCodeToKey.get(p)!).join(", "),
      });
      continue;
    }

    const branches = splitTopLevelPipes(token.value);
    const matchedAffixes: SelectOption[] = [];
    let allMatched = true;
    for (const subTerm of branches) {
      const modMatch = matchAffixSubTerm(subTerm, tabletAffixes);
      if (!modMatch) { allMatched = false; break; }
      if (modMatch.round10) tablet.modifier.round10 = true;
      matchedAffixes.push(modMatch.option);
    }
    if (allMatched && matchedAffixes.length > 0) {
      for (const opt of matchedAffixes) {
        if (!tablet.modifier.affixes.some((a) => a.name === opt.name)) {
          tablet.modifier.affixes.push(opt);
        }
      }
      affixTokensCount++;
      if (branches.length > 1) pipeJoinedAffixes = true;
      score += matchedAffixes.length * 3;
    } else {
      leftoverTokens.push(token.raw);
    }
  }

  tablet.modifier.affixSelectType = affixTokensCount > 1 && !pipeJoinedAffixes ? "all" : "any";

  if (tablet.modifier.affixes.length > 0) {
    metadata.push({
      label: "Included modifiers",
      value: `${tablet.modifier.affixes.length} (${tablet.modifier.affixSelectType === "all" ? "Match all" : "Match any"})`,
    });
  }

  if (score === 0) return null;

  if (leftoverTokens.length > 0) {
    tablet.resultSettings = {
      ...tablet.resultSettings,
      customText: leftoverTokens.join(" "),
      customTextEnabled: true,
    };
    metadata.push({label: "Custom text", value: tablet.resultSettings.customText});
  }

  return {
    pageKey: "tablet",
    pageLabel: "Tablets",
    route: "/tablet",
    score,
    metadata,
    settings: {...baseSettings, tablet},
  };
}

export function parseRelicRegex(
  input: string,
  baseSettings: Settings,
  relicAffixes?: RelicRegex[],
): RegexImportCandidate<Settings> | null {
  if (!relicAffixes || relicAffixes.length === 0) return null;
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0 || tokens.some((t) => t.negated)) return null;

  const relic: Settings["relic"] = {
    ...structuredClone(defaultSettings.relic),
    resultSettings: {
      ...baseSettings.relic.resultSettings,
      customText: "",
      customTextEnabled: false,
    },
  };

  let score = 0;
  let matchedTokenCount = 0;
  for (const token of tokens) {
    const branches = splitTopLevelPipes(token.value);
    const tokenMatches: Array<{ option: SelectOption; entry: RelicRegex }> = [];
    for (const subTerm of branches) {
      const m = matchAffixSubTerm(subTerm, relicAffixes);
      if (!m) return null;
      tokenMatches.push(m);
    }
    if (tokenMatches.length === 0) return null;
    matchedTokenCount++;
    for (const {option, entry} of tokenMatches) {
      const targetList = entry.affix === "PREFIX" ? relic.modifier.prefixes : relic.modifier.suffixes;
      if (!targetList.some((item) => item.name === option.name)) {
        targetList.push(option);
      }
      score += 3;
    }
  }

  if (score === 0) return null;
  relic.matchType = matchedTokenCount > 1 && relic.modifier.prefixes.length > 0 && relic.modifier.suffixes.length > 0
    ? "both"
    : "any";

  const metadata: RegexMetadataItem[] = [];
  if (relic.modifier.prefixes.length > 0) metadata.push({label: "Prefix modifiers", value: relic.modifier.prefixes.length});
  if (relic.modifier.suffixes.length > 0) metadata.push({label: "Suffix modifiers", value: relic.modifier.suffixes.length});
  metadata.push({label: "Match mode", value: relic.matchType === "both" ? "Match both" : "Match any"});

  return {
    pageKey: "relic",
    pageLabel: "Relics",
    route: "/relic",
    score,
    metadata,
    settings: {...baseSettings, relic},
  };
}

let poe2VendorLookup: {
  termMap: Map<string, { tag: string; apply: (g: VendorGroup) => void }>;
  itemClassCodeToKey: Map<string, keyof VendorGroup["itemClass"]>;
  itemClassPrefix: string;
} | null = null;

function getPoe2VendorLookup() {
  if (poe2VendorLookup) return poe2VendorLookup;
  const termMap = new Map<string, { tag: string; apply: (g: VendorGroup) => void }>();

  const register = (tag: string, apply: (g: VendorGroup) => void) => {
    const probe = structuredClone(defaultEmptyVendor);
    probe.condition = GroupCondition.AND;
    apply(probe);
    const out = generateVendorRegex(probe);
    if (out) termMap.set(unquote(out), {tag, apply});
  };

  for (const key of ["quality", "sockets"] as const) {
    register(`prop:${key}`, (g) => { g.itemProperty[key] = true; });
  }
  for (let mask = 1; mask < 7; mask++) {
    register("itemType", (g) => {
      g.itemType = {rare: Boolean(mask & 1), magic: Boolean(mask & 2), normal: Boolean(mask & 4)};
    });
  }
  const resKeys = ["fire", "cold", "lightning", "chaos"] as const;
  for (let mask = 1; mask < 16; mask++) {
    register("resistances", (g) => {
      resKeys.forEach((k, i) => { g.resistances[k] = Boolean(mask & (1 << i)); });
    });
  }
  const movKeys = ["move30", "move25", "move20", "move15", "move10"] as const;
  for (let mask = 1; mask < 32; mask++) {
    register("movementSpeed", (g) => {
      movKeys.forEach((k, i) => { g.movementSpeed[k] = Boolean(mask & (1 << i)); });
    });
  }
  const eleKeys = ["coldDamage", "chaosDamage", "fireDamage", "lightningDamage"] as const;
  for (let mask = 1; mask < 16; mask++) {
    register("eleDamage", (g) => {
      eleKeys.forEach((k, i) => { g.itemMods[k] = Boolean(mask & (1 << i)); });
    });
  }
  const attrKeys = ["strength", "dexterity", "intelligence"] as const;
  for (let mask = 1; mask < 8; mask++) {
    register("attributes", (g) => {
      attrKeys.forEach((k, i) => { g.itemMods[k] = Boolean(mask & (1 << i)); });
    });
  }
  for (const key of Object.keys(defaultEmptyVendor.itemMods) as Array<keyof VendorGroup["itemMods"]>) {
    if ((eleKeys as readonly string[]).includes(key) || (attrKeys as readonly string[]).includes(key)) continue;
    register(key === "elemental" ? "eleDamage" : `mod:${key}`, (g) => { g.itemMods[key] = true; });
  }

  const itemClassCodeToKey = new Map<string, keyof VendorGroup["itemClass"]>();
  let itemClassPrefix = "s: ";
  for (const key of Object.keys(defaultEmptyVendor.itemClass) as Array<keyof VendorGroup["itemClass"]>) {
    const probe = structuredClone(defaultEmptyVendor);
    probe.itemClass[key] = true;
    const out = unquote(generateVendorRegex(probe));
    const idx = out.indexOf(": ");
    if (idx !== -1) {
      itemClassPrefix = out.slice(0, idx + 2);
      itemClassCodeToKey.set(out.slice(idx + 2), key);
    }
  }

  poe2VendorLookup = {termMap, itemClassCodeToKey, itemClassPrefix};
  return poe2VendorLookup;
}

export function parsePoe2VendorRegex(
  input: string,
  baseSettings: Settings,
): RegexImportCandidate<Settings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0 || tokens.some((t) => t.negated)) return null;

  const {termMap, itemClassCodeToKey, itemClassPrefix} = getPoe2VendorLookup();

  const parseSubTerm = (subTerm: string, target: VendorGroup): string | null => {
    const entry = termMap.get(subTerm);
    if (entry) {
      entry.apply(target);
      return entry.tag;
    }
    if (subTerm.startsWith(itemClassPrefix)) {
      const parts = unwrapOuterParens(subTerm.slice(itemClassPrefix.length)).split("|");
      if (parts.length > 0 && parts.every((p) => itemClassCodeToKey.has(p))) {
        for (const p of parts) target.itemClass[itemClassCodeToKey.get(p)!] = true;
        return "itemClass";
      }
    }
    for (const [field, prefix] of [["itemLevel", "m level: ("], ["characterLevel", "s: level ("]] as const) {
      if (subTerm.startsWith(prefix) && subTerm.endsWith(")\\b")) {
        const range = parseSafeDigitRange(subTerm.slice(prefix.length, -3), 0, 99);
        if (range) {
          const levelVal = {
            min: range.min === 0 ? "" : String(range.min),
            max: range.max === 99 ? "" : String(range.max),
          };
          const probe = {...structuredClone(defaultEmptyVendor), [field]: levelVal};
          if (unquote(generateVendorRegex(probe)) === subTerm) {
            target[field] = levelVal;
            return field;
          }
        }
      }
    }
    return null;
  };

  const groups: VendorGroup[] = [];
  let currentAndGroup: { group: VendorGroup; usedTags: Set<string> } | null = null;
  const leftoverTokens: string[] = [];
  let score = 0;
  let totalTermsMatched = 0;

  for (const token of tokens) {
    const branches = splitTopLevelPipes(token.value);
    const probeGroup: VendorGroup = structuredClone(defaultEmptyVendor);
    const tags: string[] = [];
    let allMatched = true;
    for (const branch of branches) {
      const tag = parseSubTerm(branch, probeGroup);
      if (!tag) { allMatched = false; break; }
      tags.push(tag);
    }

    if (!allMatched || tags.length === 0) {
      leftoverTokens.push(token.raw);
      continue;
    }

    totalTermsMatched += tags.length;
    score += tags.some((t) => t !== "itemType") ? tags.length * 4 : 2;

    if (branches.length > 1) {
      if (currentAndGroup) {
        groups.push(currentAndGroup.group);
        currentAndGroup = null;
      }
      probeGroup.condition = GroupCondition.OR;
      groups.push(probeGroup);
    } else {
      const tag = tags[0];
      if (!currentAndGroup) {
        const g = structuredClone(defaultEmptyVendor);
        g.condition = GroupCondition.OR;
        parseSubTerm(branches[0], g);
        currentAndGroup = {group: g, usedTags: new Set([tag])};
      } else if (!currentAndGroup.usedTags.has(tag)) {
        currentAndGroup.group.condition = GroupCondition.AND;
        parseSubTerm(branches[0], currentAndGroup.group);
        currentAndGroup.usedTags.add(tag);
      } else {
        groups.push(currentAndGroup.group);
        const g = structuredClone(defaultEmptyVendor);
        g.condition = GroupCondition.OR;
        parseSubTerm(branches[0], g);
        currentAndGroup = {group: g, usedTags: new Set([tag])};
      }
    }
  }

  if (currentAndGroup) groups.push(currentAndGroup.group);
  if (score === 0 || groups.length === 0) return null;

  const vendor: Settings["vendor"] = {
    selectedGroupId: 0,
    vendorGroups: groups,
    resultSettings: {
      ...baseSettings.vendor.resultSettings,
      customText: leftoverTokens.join(" "),
      customTextEnabled: leftoverTokens.length > 0,
    },
  };

  const metadata: RegexMetadataItem[] = [
    {label: "Vendor groups", value: groups.length},
    {label: "Matched filters", value: totalTermsMatched},
  ];
  if (leftoverTokens.length > 0) {
    metadata.push({label: "Custom text", value: vendor.resultSettings.customText});
  }

  return {
    pageKey: "vendor",
    pageLabel: "Vendor",
    route: "/vendor",
    score,
    metadata,
    settings: {...baseSettings, vendor},
  };
}

export function parsePoe2RegexCandidates(
  input: string,
  baseSettings: Settings,
  catalogs: Poe2RegexCatalogs,
  currentPath?: string,
): RegexImportCandidate<Settings>[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const candidates = [
    parseWaystoneRegex(trimmed, baseSettings, catalogs.waystoneAffixes),
    parsePoe2VendorRegex(trimmed, baseSettings),
    parseTabletRegex(trimmed, baseSettings, catalogs.tabletAffixes),
    parseRelicRegex(trimmed, baseSettings, catalogs.relicAffixes),
  ].filter((c): c is RegexImportCandidate<Settings> => c !== null);

  return candidates
    .map((c) => ({
      ...c,
      score: currentPath === c.route ? c.score + 0.5 : c.score,
    }))
    .sort((a, b) => b.score - a.score);
}

export async function importPoe2Regex(
  input: string,
  baseSettings: Settings,
  currentPath?: string,
): Promise<RegexImportCandidate<Settings>[]> {
  const loadLangCatalogs = async (lang: Language): Promise<Poe2RegexCatalogs> => {
    const [waystoneAffixes, tabletAffixes, relicAffixes] = await Promise.all([
      loadWaystoneAffixes(lang).catch(() => undefined),
      loadTabletAffixes(lang).catch(() => undefined),
      loadRelicRegex(lang).catch(() => undefined),
    ]);
    return {waystoneAffixes, tabletAffixes, relicAffixes};
  };

  const targetLang = baseSettings.language;
  const targetCatalogs = await loadLangCatalogs(targetLang);
  const primary = parsePoe2RegexCandidates(input, baseSettings, targetCatalogs, currentPath);
  const hasFullMatch = primary.some((c) => !c.metadata.some((m) => m.label === "Custom text"));
  if (hasFullMatch) return primary;

  for (const fallbackLang of ALL_LANGUAGES) {
    if (fallbackLang === targetLang) continue;
    const sourceCatalogs = await loadLangCatalogs(fallbackLang);
    const fallback = parsePoe2RegexCandidates(input, baseSettings, sourceCatalogs, currentPath);
    if (fallback.some((c) => !c.metadata.some((m) => m.label === "Custom text")) || (primary.length === 0 && fallback.length > 0)) {
      return fallback.map((c) => ({
        ...c,
        settings: {
          ...c.settings,
          waystone: sourceCatalogs.waystoneAffixes && targetCatalogs.waystoneAffixes
            ? rebaseWaystoneSettings(c.settings.waystone, sourceCatalogs.waystoneAffixes, targetCatalogs.waystoneAffixes)
            : c.settings.waystone,
          tablet: sourceCatalogs.tabletAffixes && targetCatalogs.tabletAffixes
            ? rebaseTabletSettings(c.settings.tablet, sourceCatalogs.tabletAffixes, targetCatalogs.tabletAffixes)
            : c.settings.tablet,
          relic: sourceCatalogs.relicAffixes && targetCatalogs.relicAffixes
            ? rebaseRelicSettings(c.settings.relic, sourceCatalogs.relicAffixes, targetCatalogs.relicAffixes)
            : c.settings.relic,
        },
      }));
    }
  }
  return primary;
}
