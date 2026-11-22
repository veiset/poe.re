import {defaultSettings, GemsSettings, HeistSettings, MapSettings, SavedSettings, UltimatumSettings, VendorSettings} from "../SavedSettings";
import {GGPKLanguage, MapStaticStatRegex} from "../Languages";
import {MAP_TYPE_LABELS, MapType, MapTypeRegex} from "@poe/pages/maps/MapTypes";
import {heistContractTypes, heistTargetValues} from "@poe/generated/GeneratedHeist";
import {generateGemsRegex} from "@poe/pages/gems/GemsOutput";
import {uniqueRewardId} from "@poe/pages/ultimatum/UltimatumOutput";
import {generateResultString} from "../OutputString";
import {optimizeRegexFromIds} from "./OptimizeRegexResult";
import {generatePriceRangeRegex, PriceCurrency} from "./GeneratePriceRangeRegex";
import {loadGems, loadMapMods, loadUltimatum} from "../loadData";
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
import type {MapModsRegex} from "@shared/typedefs/poe1/MapMods";
import type {GemsRegex} from "@shared/typedefs/poe1/Gems";
import type {Ultimatum} from "@shared/typedefs/poe1/Ultimatum";
import type {Language} from "@shared/typedefs/Language";

export interface Poe1RegexCatalogs {
  mapMods?: MapModsRegex;
  gems?: GemsRegex;
  ultimatum?: Ultimatum;
}

const ALL_LANGUAGES = Object.keys(GGPKLanguage) as Language[];

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

function recoverBadIds(terms: string[], mapMods: MapModsRegex): number[] | null {
  const optGroups: number[][] = [];
  const singleEntries: Array<{ chosen: number; alternatives: number[] }> = [];
  const seen = new Set<number>();

  for (const subTerm of terms) {
    const matchingTokens = mapMods.tokens.filter((t) => t.regex === subTerm);
    const matchingOpts = Object.values(mapMods.optimizationTable)
      .filter((o) => o.regex === subTerm)
      .sort((a, b) => a.ids.length - b.ids.length);

    if (matchingTokens.length > 0) {
      const sorted = [...matchingTokens].sort((a, b) => Number(a.options.nm) - Number(b.options.nm));
      const chosen = sorted.find((t) => !seen.has(t.id)) ?? sorted[0];
      if (!seen.has(chosen.id)) {
        seen.add(chosen.id);
        singleEntries.push({chosen: chosen.id, alternatives: sorted.map((t) => t.id)});
      }
    } else if (matchingOpts.length > 0) {
      const opt = matchingOpts.find((o) => o.ids.every((id) => !seen.has(id))) ?? matchingOpts[0];
      const group = opt.ids.filter((id) => !seen.has(id));
      for (const id of group) seen.add(id);
      if (group.length > 0) optGroups.push(group);
    } else {
      return null;
    }
  }

  const expected = terms.join("|");
  const singleIds = singleEntries.map((e) => e.chosen);
  for (const cand of [
    [...optGroups.flat(), ...singleIds],
    [...singleIds, ...optGroups.flat()],
  ]) {
    if (optimizeRegexFromIds(cand, mapMods).join("|") === expected) return cand;
  }

  for (let i = 0; i < singleEntries.length; i++) {
    for (const alt of singleEntries[i].alternatives) {
      if (alt === singleEntries[i].chosen) continue;
      const altSingles = singleIds.map((id, idx) => (idx === i ? alt : id));
      for (const cand of [
        [...optGroups.flat(), ...altSingles],
        [...altSingles, ...optGroups.flat()],
      ]) {
        if (optimizeRegexFromIds(cand, mapMods).join("|") === expected) return cand;
      }
    }
  }

  return [...optGroups.flat(), ...singleIds];
}

export function parseMapRegex(
  input: string,
  baseSettings: SavedSettings,
  mapMods?: MapModsRegex,
): RegexImportCandidate<SavedSettings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0) return null;

  const lang = baseSettings.language;
  const statLanguages = [lang, ...ALL_LANGUAGES.filter((l) => l !== lang)];
  const statRegexes = statLanguages.map((l) => MapStaticStatRegex[l]);
  const mapTypeRegexes = statLanguages.map((l) => MapTypeRegex[l]);

  const map: MapSettings = {
    ...structuredClone(defaultSettings.map),
    displayAffixBadges: baseSettings.map.displayAffixBadges,
    displayRewardBadges: baseSettings.map.displayRewardBadges,
    groupByAffix: baseSettings.map.groupByAffix,
    tradeEightModOnly: baseSettings.map.tradeEightModOnly,
    tradeExcludeValdo: baseSettings.map.tradeExcludeValdo,
    displayNightmareMods: baseSettings.map.displayNightmareMods,
    customText: {value: "", enabled: false},
  };

  const yieldDefs: Array<{
    key: "quantity" | "packsize" | "mapDropChance" | "itemRarity" | "currency" | "scarab" | "divination";
    label: string;
    prefixes: string[];
  }> = [
    {key: "quantity", label: "Atlas Drops", prefixes: [...statRegexes.map((s) => s.quantity), "m q.*"]},
    {key: "packsize", label: "Pack Size", prefixes: statRegexes.map((s) => s.packsize)},
    {key: "mapDropChance", label: "More maps", prefixes: statRegexes.map((s) => s.mapdrop)},
    {key: "itemRarity", label: "Item rarity", prefixes: statRegexes.map((s) => s.itemrarity)},
    {key: "currency", label: "More currency", prefixes: statRegexes.map((s) => s.currency)},
    {key: "scarab", label: "More threads", prefixes: [...statRegexes.map((s) => s.scarab), "e sca.*"]},
    {key: "divination", label: "More divination", prefixes: statRegexes.map((s) => s.divination)},
  ];

  const qualityDefs: Array<{
    key: keyof MapSettings["quality"];
    label: string;
    prefixes: string[];
  }> = [
    {key: "regular", label: "Quality", prefixes: statRegexes.map((s) => s.quality_regular)},
    {key: "currency", label: "Quality (Currency)", prefixes: statRegexes.map((s) => s.quality_currency)},
    {key: "divination", label: "Quality (Divination)", prefixes: statRegexes.map((s) => s.quality_divination)},
    {key: "rarity", label: "Quality (Rarity)", prefixes: statRegexes.map((s) => s.quality_rarity)},
    {key: "packSize", label: "Quality (Pack size)", prefixes: statRegexes.map((s) => s.quality_packsize)},
    {key: "scarab", label: "Quality (Threads)", prefixes: statRegexes.map((s) => s.quality_scarab)},
  ];

  const matchMapType = (subTerm: string): MapType | undefined => {
    for (const mRegex of mapTypeRegexes) {
      for (const type of Object.keys(MAP_TYPE_LABELS) as MapType[]) {
        if (mRegex[type] === subTerm) return type;
      }
    }
    return undefined;
  };

  let mapTypesInitialized = false;
  const ensureMapTypesInitialized = () => {
    if (!mapTypesInitialized) {
      mapTypesInitialized = true;
      map.mapTypesInRegex = true;
      for (const type of Object.keys(MAP_TYPE_LABELS) as MapType[]) {
        map.mapTypes[type] = {enabled: false, include: false};
      }
    }
  };

  let score = 0;
  let qualityTokensCount = 0;
  let positiveModTokensCount = 0;
  let pipeJoinedGoodMods = false;
  let singleGoodTokenQuoted: boolean | undefined;
  let singleGoodTokenHasSpace = false;
  const badIds: number[] = [];
  const goodIds: number[] = [];
  const leftoverTokens: string[] = [];
  const metadata: RegexMetadataItem[] = [];

  for (const token of tokens) {
    const price = parseVerifiedPriceToken(token, ["chaos", "divine"] as const);
    if (price) {
      map.asyncPriceRange = {...price, enabled: true, tradeEnabled: false};
      score += 3;
      metadata.push({label: "Price range", value: `${price.min}–${price.max} ${price.currency}`});
      continue;
    }

    if (statRegexes.some((s) => token.value === s.corrupted)) {
      map.corrupted = {enabled: true, include: !token.negated};
      score += 2;
      metadata.push({label: "Corrupted", value: token.negated ? "Exclude" : "Include"});
      continue;
    }

    if (statRegexes.some((s) => token.value === s.unidentified)) {
      map.unidentified = {enabled: true, include: !token.negated};
      score += 2;
      metadata.push({label: "Unidentified", value: token.negated ? "Exclude" : "Include"});
      continue;
    }

    const tryParseRarity = (): boolean => {
      for (const sRegex of statRegexes) {
        if (!token.value.startsWith(sRegex.rarity_prefix)) continue;
        const inner = unwrapOuterParens(token.value.slice(sRegex.rarity_prefix.length));
        const parts = inner.split("|").filter(Boolean);
        if (parts.length === 0) continue;
        const valid = [sRegex.rarity_normal, sRegex.rarity_magic, sRegex.rarity_rare];
        if (!parts.every((p) => valid.includes(p))) continue;
        map.rarity = {
          normal: parts.includes(sRegex.rarity_normal),
          magic: parts.includes(sRegex.rarity_magic),
          rare: parts.includes(sRegex.rarity_rare),
          include: !token.negated,
        };
        return true;
      }
      return false;
    };
    if (tryParseRarity()) {
      score += 2;
      const labels = [
        map.rarity.normal ? "Normal" : "",
        map.rarity.magic ? "Magic" : "",
        map.rarity.rare ? "Rare" : "",
      ].filter(Boolean).join(", ");
      metadata.push({label: "Map rarity", value: `${map.rarity.include ? "Include" : "Exclude"} (${labels})`});
      continue;
    }

    const branches = splitTopLevelPipes(token.value);

    if (!token.negated) {
      const matchedYields: Array<{ key: (typeof yieldDefs)[number]["key"]; label: string; value: string; optimized: boolean }> = [];
      let allYield = true;
      for (const branch of branches) {
        if (!branch.endsWith("%")) { allYield = false; break; }
        let branchMatched = false;
        for (const def of yieldDefs) {
          const prefix = def.prefixes.find((p) => branch.startsWith(p));
          if (prefix) {
            const parsed = parseMinNumberFromRegex(branch.slice(prefix.length, -1));
            if (parsed) {
              matchedYields.push({key: def.key, label: def.label, value: parsed.value, optimized: parsed.optimized});
              branchMatched = true;
              break;
            }
          }
        }
        if (!branchMatched) { allYield = false; break; }
      }
      if (allYield && matchedYields.length > 0) {
        if (matchedYields.length > 1) map.anyYield = true;
        for (const y of matchedYields) {
          map[y.key] = y.value;
          if (y.optimized) {
            map.optimizeQuant = true;
            map.optimizePacksize = true;
          }
          metadata.push({label: y.label, value: `${y.value}%`});
        }
        score += matchedYields.length * 3;
        continue;
      }

      const matchedQualities: Array<{ key: keyof MapSettings["quality"]; label: string; value: string; optimized: boolean }> = [];
      let allQuality = true;
      for (const branch of branches) {
        if (!branch.endsWith("%")) { allQuality = false; break; }
        let branchMatched = false;
        for (const def of qualityDefs) {
          const prefix = def.prefixes.find((p) => branch.startsWith(p));
          if (prefix) {
            const parsed = parseMinNumberFromRegex(branch.slice(prefix.length, -1));
            if (parsed) {
              matchedQualities.push({key: def.key, label: def.label, value: parsed.value, optimized: parsed.optimized});
              branchMatched = true;
              break;
            }
          }
        }
        if (!branchMatched) { allQuality = false; break; }
      }
      if (allQuality && matchedQualities.length > 0) {
        qualityTokensCount++;
        if (matchedQualities.length > 1) map.anyQuality = true;
        else if (qualityTokensCount > 1) map.anyQuality = false;
        for (const q of matchedQualities) {
          map.quality[q.key] = q.value;
          if (q.optimized) map.optimizeQuality = true;
          metadata.push({label: q.label, value: `${q.value}%`});
        }
        score += matchedQualities.length * 3;
        continue;
      }

      const mapTypesMatched = branches.map(matchMapType);
      if (mapTypesMatched.every((t): t is MapType => t !== undefined)) {
        ensureMapTypesInitialized();
        for (const type of mapTypesMatched) {
          map.mapTypes[type] = {enabled: true, include: true};
        }
        score += mapTypesMatched.length * 2;
        metadata.push({
          label: "Included map types",
          value: mapTypesMatched.map((t) => MAP_TYPE_LABELS[t]).join(", "),
        });
        continue;
      }
    }

    if (token.negated) {
      const excludedTypes: MapType[] = [];
      const modSubTerms: string[] = [];
      for (const subTerm of branches) {
        const mapType = matchMapType(subTerm);
        if (mapType) {
          excludedTypes.push(mapType);
        } else {
          modSubTerms.push(subTerm);
        }
      }
      const recovered = modSubTerms.length === 0
        ? []
        : mapMods ? recoverBadIds(modSubTerms, mapMods) : null;

      if (recovered !== null && (recovered.length > 0 || excludedTypes.length > 0)) {
        if (excludedTypes.length > 0) {
          ensureMapTypesInitialized();
          for (const type of excludedTypes) {
            map.mapTypes[type] = {enabled: true, include: false};
          }
          metadata.push({
            label: "Excluded map types",
            value: excludedTypes.map((t) => MAP_TYPE_LABELS[t]).join(", "),
          });
          score += excludedTypes.length * 2;
        }
        badIds.push(...recovered);
        score += modSubTerms.length * 3;
      } else {
        leftoverTokens.push(token.raw);
      }
      continue;
    }

    // Positive tokens: exact match on mapMods.tokens only (generateGoodMods never uses optimizationTable)
    if (mapMods) {
      const tokenGoodIds: number[] = [];
      let allMatched = true;
      for (const subTerm of branches) {
        const matchingTokens = mapMods.tokens.filter((t) => t.regex === subTerm);
        if (matchingTokens.length === 0) {
          allMatched = false;
          break;
        }
        const preferred = matchingTokens.find((t) => !t.options.nm) ?? matchingTokens[0];
        tokenGoodIds.push(preferred.id);
      }
      if (allMatched && tokenGoodIds.length > 0) {
        goodIds.push(...tokenGoodIds);
        positiveModTokensCount++;
        if (branches.length > 1) {
          pipeJoinedGoodMods = true;
        } else {
          singleGoodTokenQuoted = token.quoted;
          singleGoodTokenHasSpace = branches[0].includes(" ");
        }
        score += tokenGoodIds.length * 3;
        continue;
      }
    }

    leftoverTokens.push(token.raw);
  }

  map.badIds = [...new Set(badIds)];
  map.goodIds = [...new Set(goodIds)];
  if (pipeJoinedGoodMods && positiveModTokensCount === 1) {
    map.allGoodMods = false;
  } else if (positiveModTokensCount > 1) {
    map.allGoodMods = true;
  } else if (positiveModTokensCount === 1 && !singleGoodTokenHasSpace && singleGoodTokenQuoted !== undefined) {
    map.allGoodMods = !singleGoodTokenQuoted;
  }

  if (mapMods) {
    const allSelectedIds = [...map.badIds, ...map.goodIds];
    if (allSelectedIds.some((id) => mapMods.tokens.find((t) => t.id === id)?.options.nm)) {
      map.displayNightmareMods = true;
    }
  }

  if (map.badIds.length > 0) {
    metadata.unshift({label: "Excluded map mods", value: map.badIds.length});
  }
  if (map.goodIds.length > 0) {
    metadata.push({
      label: "Included map mods",
      value: `${map.goodIds.length} (${map.allGoodMods ? "Match all" : "Match any"})`,
    });
  }

  if (score === 0) return null;

  if (leftoverTokens.length > 0) {
    map.customText = {value: leftoverTokens.join(" "), enabled: true};
    metadata.push({label: "Custom text", value: map.customText.value});
  }

  return {
    pageKey: "maps",
    pageLabel: "Map mods",
    route: "/maps",
    score,
    metadata,
    settings: {...baseSettings, map},
  };
}

const unquoteGenerated = (s: string) =>
  s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;

let poe1VendorLookup: {
  branchApply: Map<string, (v: VendorSettings) => void>;
  weaponCodeToKey: Map<string, keyof VendorSettings["weapon"]>;
  weaponPrefix: string;
} | null = null;

function getPoe1VendorLookup() {
  if (poe1VendorLookup) return poe1VendorLookup;
  const branchApply = new Map<string, (v: VendorSettings) => void>();

  const register = (mutate: (v: VendorSettings) => void) => {
    const probe = structuredClone(defaultSettings.vendor);
    mutate(probe);
    const out = unquoteGenerated(generateResultString(probe));
    for (const part of splitTopLevelPipes(out)) {
      branchApply.set(part, mutate);
    }
  };

  for (const key of [
    "anyTwoLink", "anyThreeLink", "anyFourLink", "anyFiveLink", "anySixLink",
    "anyTwoColorLink", "anyThreeColorLink", "anyFourColorLink", "anyFiveColorLink", "anySixColorLink",
    "anySixSocket",
  ] as const) {
    register((v) => { v[key] = true; });
  }
  for (const key of ["ten", "fifteen"] as const) {
    register((v) => { v.movement[key] = true; });
  }
  for (const key of ["any", "fire", "cold", "lightning", "chaos", "phys"] as const) {
    register((v) => { v.plusGems[key] = true; });
  }
  for (const key of ["phys", "firemult", "coldmult", "chaosmult"] as const) {
    register((v) => { v.damage[key] = true; });
  }
  for (const key of ["rr", "gg", "bb", "rb", "gr", "bg", "rgb"] as const) {
    register((v) => { v.colors[key] = true; });
  }

  const weaponCodeToKey = new Map<string, keyof VendorSettings["weapon"]>();
  let weaponPrefix = "s:.+";
  for (const key of Object.keys(defaultSettings.vendor.weapon) as Array<keyof VendorSettings["weapon"]>) {
    const probe = structuredClone(defaultSettings.vendor);
    probe.weapon[key] = true;
    const out = unquoteGenerated(generateResultString(probe));
    const idx = out.indexOf(".+");
    if (idx !== -1) {
      weaponPrefix = out.slice(0, idx + 2);
      weaponCodeToKey.set(out.slice(idx + 2), key);
    }
  }

  poe1VendorLookup = {branchApply, weaponCodeToKey, weaponPrefix};
  return poe1VendorLookup;
}

export function parseVendorRegex(
  input: string,
  baseSettings: SavedSettings,
): RegexImportCandidate<SavedSettings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0 || tokens.some((t) => t.negated)) return null;

  const {branchApply, weaponCodeToKey, weaponPrefix} = getPoe1VendorLookup();
  const vendor: VendorSettings = structuredClone(defaultSettings.vendor);
  const branches = tokens.flatMap((t) => splitTopLevelPipes(t.value));
  const threeLinkBranches: string[] = [];
  let score = 0;

  for (const branch of branches) {
    const apply = branchApply.get(branch);
    if (apply) {
      apply(vendor);
      score += 3;
      continue;
    }
    if (branch.startsWith("ts:.+")) {
      const rMatch = /\(\\S\*r\)\{(\d+)\}/.exec(branch);
      const gMatch = /\(\\S\*g\)\{(\d+)\}/.exec(branch);
      const bMatch = /\(\\S\*b\)\{(\d+)\}/.exec(branch);
      if (rMatch || gMatch || bMatch) {
        vendor.colors.specLink = true;
        vendor.colors.specLinkColors = {
          r: rMatch ? Number(rMatch[1]) : undefined,
          g: gMatch ? Number(gMatch[1]) : undefined,
          b: bMatch ? Number(bMatch[1]) : undefined,
        };
        score += 4;
        continue;
      }
    }
    if (branch.startsWith(weaponPrefix)) {
      const parts = unwrapOuterParens(branch.slice(weaponPrefix.length)).split("|");
      if (parts.length > 0 && parts.every((p) => weaponCodeToKey.has(p))) {
        for (const p of parts) {
          vendor.weapon[weaponCodeToKey.get(p)!] = true;
        }
        score += parts.length * 3;
        continue;
      }
    }
    if ((branch.match(/-/g) ?? []).length === 2 && /^[rgb.\[\]()\-]{3,20}$/.test(branch)) {
      threeLinkBranches.push(branch);
      continue;
    }
    return null;
  }

  if (threeLinkBranches.length > 0) {
    for (const c of ["r", "g", "b"] as const) {
      if ([`.-.-${c}`, `.-${c}-.`, `${c}-.-.`].every((p) => threeLinkBranches.includes(p))) {
        vendor.colors[`${c}aa`] = true;
        score += 3;
      }
    }
    const afterOneAny = threeLinkBranches.filter((b) =>
      !(["r", "g", "b"] as const).some((c) =>
        vendor.colors[`${c}aa`] && (b === `.-.-${c}` || b === `.-${c}-.` || b === `${c}-.-.`)),
    );
    for (const [c, key] of [["r", "rrA"], ["g", "ggA"], ["b", "bbA"]] as const) {
      if (afterOneAny.includes(`${c}-${c}-`) && afterOneAny.includes(`-${c}-${c}`)) {
        vendor.colors[key] = true;
        score += 3;
      }
    }
    const afterTwoAny = afterOneAny.filter((b) =>
      !([["r", "rrA"], ["g", "ggA"], ["b", "bbA"]] as const).some(([c, key]) =>
        vendor.colors[key] && (b === `${c}-${c}-` || b === `-${c}-${c}` || b === `${c}-.-${c}` || b === `${c}-[rgb]-${c}`)),
    );
    if (afterTwoAny.length > 0) {
      const remRe = new RegExp(`^(?:${afterTwoAny.join("|")})$`);
      const checks: Array<[keyof VendorSettings["colors"], string[]]> = [
        ["rrr", ["r-r-r"]], ["ggg", ["g-g-g"]], ["bbb", ["b-b-b"]],
        ["rrg", ["r-r-g", "r-g-r", "g-r-r"]], ["rrb", ["r-r-b", "r-b-r", "b-r-r"]],
        ["ggr", ["g-g-r", "g-r-g", "r-g-g"]], ["ggb", ["g-g-b", "g-b-g", "b-g-g"]],
        ["bbr", ["b-b-r", "b-r-b", "r-b-b"]], ["bbg", ["b-b-g", "b-g-b", "g-b-b"]],
      ];
      for (const [key, patterns] of checks) {
        if (patterns.every((p) => remRe.test(p))) {
          (vendor.colors as unknown as Record<string, boolean>)[key] = true;
          score += 3;
        }
      }
    }
  }

  if (score === 0) return null;

  return {
    pageKey: "vendor",
    pageLabel: "Vendor",
    route: "/vendor",
    score,
    metadata: [{label: "Matched filters", value: branches.length}],
    settings: {...baseSettings, vendor},
  };
}

let gemLevelLookup: Map<string, { min: string; max: string }> | null = null;
let gemQualityLookup: Map<string, { min: string; max: string }> | null = null;

function getGemLookups() {
  if (!gemLevelLookup || !gemQualityLookup) {
    gemLevelLookup = new Map();
    gemQualityLookup = new Map();
    for (let lo = 1; lo <= 21; lo++) {
      for (let hi = lo; hi <= 21; hi++) {
        const min = String(lo);
        const max = String(hi);
        const out = generateGemsRegex({...defaultSettings.gems, levelEnabled: true, levelMin: min, levelMax: max});
        gemLevelLookup.set(out, {min, max});
      }
    }
    for (let lo = 0; lo <= 23; lo++) {
      for (let hi = lo; hi <= 23; hi++) {
        const min = String(lo);
        const max = String(hi);
        const out = generateGemsRegex({...defaultSettings.gems, qualityEnabled: true, qualityMin: min, qualityMax: max});
        gemQualityLookup.set(out, {min, max});
      }
    }
  }
  return {gemLevelLookup, gemQualityLookup};
}

export function parseGemsRegex(
  input: string,
  baseSettings: SavedSettings,
  gemsCatalog?: GemsRegex,
): RegexImportCandidate<SavedSettings> | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const {gemLevelLookup: levelMap, gemQualityLookup: qualityMap} = getGemLookups();
  const gems: GemsSettings = structuredClone(defaultSettings.gems);
  const metadata: RegexMetadataItem[] = [];
  let score = 0;

  // Extract trailing quoted level / quality tokens first so an unquoted single gem with spaces stays intact.
  const tokens = tokenizeRegex(trimmed);
  let consumedFromEnd = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const raw = tokens[i].raw;
    const levelMatch = levelMap.get(raw);
    if (levelMatch && !gems.levelEnabled) {
      gems.levelEnabled = true;
      gems.levelMin = levelMatch.min;
      gems.levelMax = levelMatch.max;
      score += 4;
      metadata.unshift({label: "Gem level", value: `${levelMatch.min}–${levelMatch.max}`});
      consumedFromEnd++;
      continue;
    }
    const qualityMatch = qualityMap.get(raw);
    if (qualityMatch && !gems.qualityEnabled) {
      gems.qualityEnabled = true;
      gems.qualityMin = qualityMatch.min;
      gems.qualityMax = qualityMatch.max;
      score += 4;
      metadata.unshift({label: "Gem quality", value: `${qualityMatch.min}%–${qualityMatch.max}%`});
      consumedFromEnd++;
      continue;
    }
    break;
  }

  const remainingTokens = tokens.slice(0, tokens.length - consumedFromEnd);
  if (remainingTokens.length > 0) {
    if (!gemsCatalog || remainingTokens.some((t) => t.negated)) return null;
    // A single gem is emitted unquoted by generateGemsRegex even when its regex contains spaces.
    const rawPrefix = remainingTokens.map((t) => t.raw).join(" ");
    const unquotedPrefix = remainingTokens.length === 1 && remainingTokens[0].quoted
      ? remainingTokens[0].value
      : rawPrefix;
    const singleGem = !remainingTokens[0].quoted
      ? gemsCatalog.tokens.filter((g) => g.regex === rawPrefix)
      : [];

    if (singleGem.length > 0) {
      gems.selected = [singleGem[0].id];
      score += 4;
    } else if (remainingTokens.length === 1) {
      const branches = splitTopLevelPipes(unquotedPrefix);
      const selected: number[] = [];
      for (const subTerm of branches) {
        const match = gemsCatalog.tokens.find((g) => g.regex === subTerm);
        if (!match) return null;
        if (!selected.includes(match.id)) selected.push(match.id);
      }
      gems.selected = selected;
      score += selected.length * 3;
    } else {
      return null;
    }
    metadata.unshift({label: "Selected gems", value: gems.selected.length});
  }

  if (score === 0) return null;

  return {
    pageKey: "gems",
    pageLabel: "Gems",
    route: "/gems",
    score,
    metadata,
    settings: {...baseSettings, gems},
  };
}

export function parseUltimatumRegex(
  input: string,
  baseSettings: SavedSettings,
  data?: Ultimatum,
): RegexImportCandidate<SavedSettings> | null {
  if (!data) return null;
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0) return null;

  const ultimatum: UltimatumSettings = {
    avoidModifiers: [],
    rewards: [],
    sacrifices: [],
  };
  let score = 0;

  for (const token of tokens) {
    const branches = splitTopLevelPipes(token.value);
    if (token.negated) {
      const excludedRewardIds: string[] = [];
      const excludedSacrificeIds: string[] = [];
      for (const subTerm of branches) {
        const mod = data.modifiers.find((m) => m.regex === subTerm);
        if (mod) {
          ultimatum.avoidModifiers.push(mod.id);
          score += 3;
          continue;
        }
        const reward = data.rewards.find((r) => r.regex === subTerm);
        if (reward) {
          excludedRewardIds.push(reward.id);
          score += 2;
          continue;
        }
        const sacrifice = data.sacrifices.find((s) => s.regex === subTerm);
        if (sacrifice) {
          excludedSacrificeIds.push(sacrifice.id);
          score += 2;
          continue;
        }
        return null;
      }
      if (excludedRewardIds.length > 0) {
        ultimatum.rewards.push(uniqueRewardId);
        for (const r of data.rewards) {
          if (r.id !== uniqueRewardId && !excludedRewardIds.includes(r.id)) ultimatum.rewards.push(r.id);
        }
        if (excludedSacrificeIds.length > 0) {
          for (const s of data.sacrifices) {
            if (!excludedSacrificeIds.includes(s.id)) ultimatum.sacrifices.push(s.id);
          }
        }
      }
    } else {
      for (const subTerm of branches) {
        const reward = data.rewards.find((r) => r.regex === subTerm);
        if (reward) {
          ultimatum.rewards.push(reward.id);
          score += 3;
          continue;
        }
        const sacrifice = data.sacrifices.find((s) => s.regex === subTerm);
        if (sacrifice) {
          ultimatum.sacrifices.push(sacrifice.id);
          score += 3;
          continue;
        }
        return null;
      }
    }
  }

  if (score === 0) return null;
  ultimatum.avoidModifiers = [...new Set(ultimatum.avoidModifiers)];
  ultimatum.rewards = [...new Set(ultimatum.rewards)];
  ultimatum.sacrifices = [...new Set(ultimatum.sacrifices)];

  const metadata: RegexMetadataItem[] = [];
  if (ultimatum.avoidModifiers.length > 0) metadata.push({label: "Modifiers to avoid", value: ultimatum.avoidModifiers.length});
  if (ultimatum.rewards.length > 0) metadata.push({label: "Rewards", value: ultimatum.rewards.length});
  if (ultimatum.sacrifices.length > 0) metadata.push({label: "Sacrifices", value: ultimatum.sacrifices.length});

  return {
    pageKey: "ultimatum",
    pageLabel: "Ultimatum",
    route: "/ultimatum",
    score,
    metadata,
    settings: {...baseSettings, ultimatum},
  };
}

export function parseHeistRegex(
  input: string,
  baseSettings: SavedSettings,
): RegexImportCandidate<SavedSettings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0 || tokens.some((t) => t.negated)) return null;

  const heist: HeistSettings = structuredClone(defaultSettings.heist);
  const allTargets = Object.values(heistTargetValues);
  const contractTypes = Object.values(heistContractTypes);
  let score = 0;
  let matchedContracts = 0;
  let matchedTarget = false;

  for (const token of tokens) {
    const branches = splitTopLevelPipes(token.value);
    for (const branch of branches) {
      if (branch.startsWith("t:.*(") && branch.endsWith(")")) {
        const targetTerms = branch.slice(5, -1).split("|");
        const matched = allTargets.filter((t) => targetTerms.includes(t.matchSafe));
        if (matched.length === 0 || matched.length !== targetTerms.length) return null;
        const minIncluded = Math.min(...matched.map((t) => t.coinValue));
        const excluded = allTargets.filter((t) => !targetTerms.includes(t.matchSafe) && t.coinValue < minIncluded);
        const maxExcluded = excluded.length > 0 ? Math.max(...excluded.map((t) => t.coinValue)) : 0;
        heist.targetValue = maxExcluded <= 3000 && 3000 < minIncluded ? 3000 : Math.max(1, minIncluded - 1);
        matchedTarget = true;
        score += 4;
        continue;
      }

      const contractType = contractTypes.find((c) => branch.startsWith(c.matchSafe));
      if (!contractType) return null;
      const suffix = branch.slice(contractType.matchSafe.length);
      let start = 1;
      let end = 5;
      if (suffix.length > 0) {
        if (!suffix.startsWith(".*")) return null;
        const range = parseSafeDigitRange(suffix.slice(2), 1, 5);
        if (!range) return null;
        start = range.min;
        end = range.max;
      }
      const entry = heist.contractLevels.find((c) => c.type.name === contractType.name);
      if (entry) {
        entry.start = start;
        entry.end = end;
        matchedContracts++;
        score += 3;
      }
    }
  }

  if (score === 0) return null;
  heist.requireCoinValue = tokens.length > 1 && matchedTarget && matchedContracts > 0;

  const metadata: RegexMetadataItem[] = [];
  if (matchedContracts > 0) metadata.push({label: "Contract types", value: matchedContracts});
  if (matchedTarget) metadata.push({label: "Min target value", value: heist.targetValue});

  return {
    pageKey: "heist",
    pageLabel: "Heist",
    route: "/heist",
    score,
    metadata,
    settings: {...baseSettings, heist},
  };
}

export function parsePoe1RegexCandidates(
  input: string,
  baseSettings: SavedSettings,
  catalogs: Poe1RegexCatalogs,
  currentPath?: string,
): RegexImportCandidate<SavedSettings>[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const candidates = [
    parseMapRegex(trimmed, baseSettings, catalogs.mapMods),
    parseVendorRegex(trimmed, baseSettings),
    parseGemsRegex(trimmed, baseSettings, catalogs.gems),
    parseUltimatumRegex(trimmed, baseSettings, catalogs.ultimatum),
    parseHeistRegex(trimmed, baseSettings),
  ].filter((c): c is RegexImportCandidate<SavedSettings> => c !== null);

  return candidates
    .map((c) => ({
      ...c,
      score: currentPath === c.route ? c.score + 0.5 : c.score,
    }))
    .sort((a, b) => b.score - a.score);
}

export async function importPoe1Regex(
  input: string,
  baseSettings: SavedSettings,
  currentPath?: string,
): Promise<RegexImportCandidate<SavedSettings>[]> {
  const tryLang = async (lang: Language) => {
    const [mapMods, gems, ultimatum] = await Promise.all([
      loadMapMods(lang).catch(() => undefined),
      loadGems(lang).catch(() => undefined),
      loadUltimatum(lang).catch(() => undefined),
    ]);
    return parsePoe1RegexCandidates(input, baseSettings, {mapMods, gems, ultimatum}, currentPath);
  };

  const primary = await tryLang(baseSettings.language);
  const hasFullMatch = primary.some((c) => !c.metadata.some((m) => m.label === "Custom text"));
  if (hasFullMatch) return primary;

  for (const fallbackLang of ALL_LANGUAGES) {
    if (fallbackLang === baseSettings.language) continue;
    const fallback = await tryLang(fallbackLang);
    if (fallback.some((c) => !c.metadata.some((m) => m.label === "Custom text")) || (primary.length === 0 && fallback.length > 0)) {
      return fallback;
    }
  }
  return primary;
}
