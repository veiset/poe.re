import {defaultSettings, GemsSettings, HeistSettings, MapSettings, SavedSettings, UltimatumSettings, VendorSettings} from "../SavedSettings";
import {MapStaticStatRegex} from "../Languages";
import {MAP_TYPE_LABELS, MapType, MapTypeRegex} from "@poe/pages/maps/MapTypes";
import {heistContractTypes, heistTargetValues} from "@poe/generated/GeneratedHeist";
import {uniqueRewardId} from "@poe/pages/ultimatum/UltimatumOutput";
import {loadGems, loadMapMods, loadUltimatum} from "../loadData";
import {regexSearch} from "./ReverseRegexLookup";
import {
  parseMinNumberFromRegex,
  parseNumberRangeFromRegex,
  parsePriceRangeToken,
  RegexImportCandidate,
  splitTopLevelPipes,
  tokenizeRegex,
  unwrapOuterParens,
} from "@shared/core/regex/ParseRegex";
import type {MapModsRegex} from "@shared/typedefs/poe1/MapMods";
import type {GemsRegex} from "@shared/typedefs/poe1/Gems";
import type {Ultimatum} from "@shared/typedefs/poe1/Ultimatum";
import type {ProfileMetadata} from "@shared/components/profile/ProfileImportBox";

export interface Poe1RegexCatalogs {
  mapMods?: MapModsRegex;
  gems?: GemsRegex;
  ultimatum?: Ultimatum;
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)];
}

function matchMapModSubTerm(
  subTerm: string,
  mapMods?: MapModsRegex,
): { ids: number[]; exact: boolean } | null {
  if (!mapMods) return null;
  const exactIds: number[] = [];

  for (const opt of Object.values(mapMods.optimizationTable)) {
    if (opt.regex === subTerm) {
      exactIds.push(...opt.ids);
    }
  }
  for (const token of mapMods.tokens) {
    if (token.regex === subTerm) {
      exactIds.push(token.id);
    }
  }
  if (exactIds.length > 0) {
    return {ids: uniqueNumbers(exactIds), exact: true};
  }

  if (subTerm.length < 2) return null;
  const fuzzyIds = mapMods.tokens
    .filter((token) => regexSearch(token.rawText, subTerm))
    .map((token) => token.id);
  if (fuzzyIds.length > 0) {
    return {ids: uniqueNumbers(fuzzyIds), exact: false};
  }
  return null;
}

export function parseMapRegex(
  input: string,
  baseSettings: SavedSettings,
  mapMods?: MapModsRegex,
): RegexImportCandidate<SavedSettings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0) return null;

  const lang = baseSettings.language;
  const statRegex = MapStaticStatRegex[lang] ?? MapStaticStatRegex.ENGLISH;
  const enStatRegex = MapStaticStatRegex.ENGLISH;
  const mapTypeRegex = MapTypeRegex[lang] ?? MapTypeRegex.ENGLISH;
  const enMapTypeRegex = MapTypeRegex.ENGLISH;

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
    {key: "quantity", label: "Atlas Drops", prefixes: [statRegex.quantity, enStatRegex.quantity, "m q.*"]},
    {key: "packsize", label: "Pack Size", prefixes: [statRegex.packsize, enStatRegex.packsize]},
    {key: "mapDropChance", label: "More maps", prefixes: [statRegex.mapdrop, enStatRegex.mapdrop]},
    {key: "itemRarity", label: "Item rarity", prefixes: [statRegex.itemrarity, enStatRegex.itemrarity]},
    {key: "currency", label: "More currency", prefixes: [statRegex.currency, enStatRegex.currency]},
    {key: "scarab", label: "More threads", prefixes: [statRegex.scarab, enStatRegex.scarab, "e sca.*"]},
    {key: "divination", label: "More divination", prefixes: [statRegex.divination, enStatRegex.divination]},
  ];

  const qualityDefs: Array<{
    key: keyof MapSettings["quality"];
    label: string;
    prefixes: string[];
  }> = [
    {key: "regular", label: "Quality", prefixes: [statRegex.quality_regular, enStatRegex.quality_regular]},
    {key: "currency", label: "Quality (Currency)", prefixes: [statRegex.quality_currency, enStatRegex.quality_currency]},
    {key: "divination", label: "Quality (Divination)", prefixes: [statRegex.quality_divination, enStatRegex.quality_divination]},
    {key: "rarity", label: "Quality (Rarity)", prefixes: [statRegex.quality_rarity, enStatRegex.quality_rarity]},
    {key: "packSize", label: "Quality (Pack size)", prefixes: [statRegex.quality_packsize, enStatRegex.quality_packsize]},
    {key: "scarab", label: "Quality (Threads)", prefixes: [statRegex.quality_scarab, enStatRegex.quality_scarab]},
  ];

  const matchMapType = (subTerm: string): MapType | undefined => {
    for (const type of Object.keys(MAP_TYPE_LABELS) as MapType[]) {
      if (mapTypeRegex[type] === subTerm || enMapTypeRegex[type] === subTerm) {
        return type;
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
  const badIds: number[] = [];
  const goodIds: number[] = [];
  const leftoverTokens: string[] = [];
  const metadata: ProfileMetadata[] = [];

  for (const token of tokens) {
    // 1. Price range
    const price = parsePriceRangeToken(token, ["chaos", "divine"] as const);
    if (price) {
      map.asyncPriceRange = {...price, enabled: true, tradeEnabled: false};
      score += 3;
      metadata.push({label: "Price range", value: `${price.min}–${price.max} ${price.currency}`});
      continue;
    }

    // 2. Corrupted
    if (token.value === statRegex.corrupted || token.value === enStatRegex.corrupted) {
      map.corrupted = {enabled: true, include: !token.negated};
      score += 2;
      metadata.push({label: "Corrupted", value: token.negated ? "Exclude" : "Include"});
      continue;
    }

    // 3. Unidentified
    if (token.value === statRegex.unidentified || token.value === enStatRegex.unidentified) {
      map.unidentified = {enabled: true, include: !token.negated};
      score += 2;
      metadata.push({label: "Unidentified", value: token.negated ? "Exclude" : "Include"});
      continue;
    }

    // 4. Rarity
    const tryParseRarity = (sRegex: typeof statRegex): boolean => {
      if (!token.value.startsWith(sRegex.rarity_prefix)) return false;
      const inner = unwrapOuterParens(token.value.slice(sRegex.rarity_prefix.length));
      const parts = inner.split("|").filter(Boolean);
      if (parts.length === 0) return false;
      const valid = [sRegex.rarity_normal.toLowerCase(), sRegex.rarity_magic.toLowerCase(), sRegex.rarity_rare.toLowerCase()];
      if (!parts.every((p) => valid.includes(p.toLowerCase()))) return false;
      map.rarity = {
        normal: parts.some((p) => p.toLowerCase() === sRegex.rarity_normal.toLowerCase()),
        magic: parts.some((p) => p.toLowerCase() === sRegex.rarity_magic.toLowerCase()),
        rare: parts.some((p) => p.toLowerCase() === sRegex.rarity_rare.toLowerCase()),
        include: !token.negated,
      };
      return true;
    };
    if (tryParseRarity(statRegex) || tryParseRarity(enStatRegex)) {
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

    // 5. Yield quantifiers
    if (!token.negated) {
      const matchedYields: Array<{ key: (typeof yieldDefs)[number]["key"]; label: string; value: string; optimized: boolean }> = [];
      let allYield = true;
      for (const branch of branches) {
        if (!branch.endsWith("%")) {
          allYield = false;
          break;
        }
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
        if (!branchMatched) {
          allYield = false;
          break;
        }
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

      // 6. Quality quantifiers
      const matchedQualities: Array<{ key: keyof MapSettings["quality"]; label: string; value: string; optimized: boolean }> = [];
      let allQuality = true;
      for (const branch of branches) {
        if (!branch.endsWith("%")) {
          allQuality = false;
          break;
        }
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
        if (!branchMatched) {
          allQuality = false;
          break;
        }
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

      // 7. Included Map Types
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

    // 8. Negated tokens: excluded map mods and excluded map types
    if (token.negated) {
      let matchedInToken = 0;
      const excludedTypes: MapType[] = [];
      for (const subTerm of branches) {
        const mapType = matchMapType(subTerm);
        if (mapType) {
          ensureMapTypesInitialized();
          map.mapTypes[mapType] = {enabled: true, include: false};
          excludedTypes.push(mapType);
          matchedInToken++;
          score += 2;
          continue;
        }
        const modMatch = matchMapModSubTerm(subTerm, mapMods);
        if (modMatch) {
          badIds.push(...modMatch.ids);
          matchedInToken++;
          score += modMatch.exact ? 3 : 2;
        }
      }
      if (excludedTypes.length > 0) {
        metadata.push({
          label: "Excluded map types",
          value: excludedTypes.map((t) => MAP_TYPE_LABELS[t]).join(", "),
        });
      }
      if (matchedInToken === 0) {
        leftoverTokens.push(token.raw);
      }
      continue;
    }

    // 9. Positive tokens: wanted map mods
    let matchedGoodInToken = 0;
    const tokenGoodIds: number[] = [];
    let tokenScore = 0;
    for (const subTerm of branches) {
      const modMatch = matchMapModSubTerm(subTerm, mapMods);
      if (modMatch) {
        tokenGoodIds.push(...modMatch.ids);
        matchedGoodInToken++;
        tokenScore += modMatch.exact ? 3 : 1;
      }
    }
    if (matchedGoodInToken === branches.length && tokenGoodIds.length > 0) {
      goodIds.push(...tokenGoodIds);
      positiveModTokensCount++;
      if (branches.length > 1) pipeJoinedGoodMods = true;
      score += tokenScore;
    } else {
      leftoverTokens.push(token.raw);
    }
  }

  map.badIds = uniqueNumbers(badIds);
  map.goodIds = uniqueNumbers(goodIds);
  if (pipeJoinedGoodMods && positiveModTokensCount === 1) {
    map.allGoodMods = false;
  } else if (positiveModTokensCount > 1) {
    map.allGoodMods = true;
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

export function parseVendorRegex(
  input: string,
  baseSettings: SavedSettings,
): RegexImportCandidate<SavedSettings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0 || tokens.some((t) => t.negated)) return null;

  const vendor: VendorSettings = structuredClone(defaultSettings.vendor);
  const branches = tokens.flatMap((t) => splitTopLevelPipes(t.value));
  const threeLinkBranches: string[] = [];
  let score = 0;

  const weaponMap: Record<string, keyof VendorSettings["weapon"]> = {
    sc: "sceptre",
    mac: "mace",
    ax: "axe",
    sw: "sword",
    bow: "bow",
    cl: "claw",
    da: "dagger",
    stave: "staff",
    wa: "wand",
    sh: "shield",
  };

  for (const branch of branches) {
    if (branch === "(\\w[ -]){5}\\w") {
      vendor.anySixSocket = true;
      score += 3;
    } else if (branch === "[rgb]-[rgb]") {
      vendor.anyTwoColorLink = true;
      score += 3;
    } else if (branch === "([rgb]-){2}[rgb]") {
      vendor.anyThreeColorLink = true;
      score += 3;
    } else if (branch === "([rgb]-){3}[rgb]") {
      vendor.anyFourColorLink = true;
      score += 3;
    } else if (branch === "([rgb]-){4}[rgb]") {
      vendor.anyFiveColorLink = true;
      score += 3;
    } else if (branch === "([rgb]-){5}[rgb]") {
      vendor.anySixColorLink = true;
      score += 3;
    } else if (branch === "ts:.*\\w-") {
      vendor.anyTwoLink = true;
      score += 3;
    } else if (branch === "-[rgbw]-" || branch === "-[rgb]-") {
      vendor.anyThreeLink = true;
      score += 3;
    } else if (branch === "-\\w-.-") {
      vendor.anyFourLink = true;
      score += 3;
    } else if (branch === "(-\\w){4}") {
      vendor.anyFiveLink = true;
      score += 3;
    } else if (branch === "(-\\w){5}") {
      vendor.anySixLink = true;
      score += 3;
    } else if (branch.startsWith("ts:.+")) {
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
      }
    } else if (branch === ":.*(?=\\S*r)(?=\\S*g)(?=\\S*b)") {
      vendor.colors.rgb = true;
      score += 4;
    } else if (branch === "Runn") {
      vendor.movement.ten = true;
      score += 3;
    } else if (branch === "rint") {
      vendor.movement.fifteen = true;
      score += 3;
    } else if (branch === "ll g") {
      vendor.plusGems.any = true;
      score += 3;
    } else if (branch === "me Sh") {
      vendor.plusGems.fire = true;
      score += 3;
    } else if (branch === "singe") {
      vendor.plusGems.cold = true;
      score += 3;
    } else if (branch === "derha") {
      vendor.plusGems.lightning = true;
      score += 3;
    } else if (branch === "Lord") {
      vendor.plusGems.chaos = true;
      score += 3;
    } else if (branch === "Litho") {
      vendor.plusGems.phys = true;
      score += 3;
    } else if (branch === "d.+cal d") {
      vendor.damage.phys = true;
      score += 3;
    } else if (branch === "fi.+d.+er$") {
      vendor.damage.firemult = true;
      score += 3;
    } else if (branch === "co.+d.+er$") {
      vendor.damage.coldmult = true;
      score += 3;
    } else if (branch === "ch.+d.+er$") {
      vendor.damage.chaosmult = true;
      score += 3;
    } else if (branch.startsWith("s:.+")) {
      const rest = unwrapOuterParens(branch.slice(4));
      const parts = rest.split("|");
      if (parts.length > 0 && parts.every((p) => p in weaponMap)) {
        for (const p of parts) {
          vendor.weapon[weaponMap[p]] = true;
        }
        score += parts.length * 3;
      }
    } else if (branch === "r-r") {
      vendor.colors.rr = true;
      score += 3;
    } else if (branch === "g-g") {
      vendor.colors.gg = true;
      score += 3;
    } else if (branch === "b-b") {
      vendor.colors.bb = true;
      score += 3;
    } else if (branch === "r-b" || branch === "b-r") {
      vendor.colors.rb = true;
      score += 2;
    } else if (branch === "g-r" || branch === "r-g") {
      vendor.colors.gr = true;
      score += 2;
    } else if (branch === "b-g" || branch === "g-b") {
      vendor.colors.bg = true;
      score += 2;
    } else if ((branch.match(/-/g) ?? []).length === 2 && /^[rgb.\[\]()\-]+$/.test(branch)) {
      threeLinkBranches.push(branch);
    } else {
      // Unrecognized branch in vendor regex
      return null;
    }
  }

  if (threeLinkBranches.length > 0) {
    try {
      const anyWildcardMatches = (c: "r" | "g" | "b") => {
        const patterns = [`.-.-${c}`, `.-${c}-.`, `${c}-.-.`];
        return patterns.every((p) => threeLinkBranches.includes(p));
      };
      if (anyWildcardMatches("r")) { vendor.colors.raa = true; score += 3; }
      if (anyWildcardMatches("g")) { vendor.colors.gaa = true; score += 3; }
      if (anyWildcardMatches("b")) { vendor.colors.baa = true; score += 3; }

      const afterOneAny = threeLinkBranches.filter((b) => {
        for (const c of ["r", "g", "b"] as const) {
          const active = c === "r" ? vendor.colors.raa : c === "g" ? vendor.colors.gaa : vendor.colors.baa;
          if (active && (b === `.-.-${c}` || b === `.-${c}-.` || b === `${c}-.-.`)) return false;
        }
        return true;
      });

      for (const c of ["r", "g", "b"] as const) {
        if (afterOneAny.includes(`${c}-${c}-`) && afterOneAny.includes(`-${c}-${c}`)) {
          if (c === "r") vendor.colors.rrA = true;
          if (c === "g") vendor.colors.ggA = true;
          if (c === "b") vendor.colors.bbA = true;
          score += 3;
        }
      }

      const afterTwoAny = afterOneAny.filter((b) => {
        for (const c of ["r", "g", "b"] as const) {
          const active = c === "r" ? vendor.colors.rrA : c === "g" ? vendor.colors.ggA : vendor.colors.bbA;
          if (active && (b === `${c}-${c}-` || b === `-${c}-${c}` || b === `${c}-.-${c}` || b === `${c}-[rgb]-${c}`)) {
            return false;
          }
        }
        return true;
      });

      if (afterTwoAny.length > 0) {
        const remRe = new RegExp(`^(?:${afterTwoAny.join("|")})$`);
        if (remRe.test("r-r-r")) { vendor.colors.rrr = true; score += 3; }
        if (remRe.test("g-g-g")) { vendor.colors.ggg = true; score += 3; }
        if (remRe.test("b-b-b")) { vendor.colors.bbb = true; score += 3; }

        if (remRe.test("r-r-g") && remRe.test("r-g-r") && remRe.test("g-r-r")) { vendor.colors.rrg = true; score += 3; }
        if (remRe.test("r-r-b") && remRe.test("r-b-r") && remRe.test("b-r-r")) { vendor.colors.rrb = true; score += 3; }
        if (remRe.test("g-g-r") && remRe.test("g-r-g") && remRe.test("r-g-g")) { vendor.colors.ggr = true; score += 3; }
        if (remRe.test("g-g-b") && remRe.test("g-b-g") && remRe.test("b-g-g")) { vendor.colors.ggb = true; score += 3; }
        if (remRe.test("b-b-r") && remRe.test("b-r-b") && remRe.test("r-b-b")) { vendor.colors.bbr = true; score += 3; }
        if (remRe.test("b-b-g") && remRe.test("b-g-b") && remRe.test("g-b-b")) { vendor.colors.bbg = true; score += 3; }
      }
    } catch {
      return null;
    }
  }

  if (score === 0) return null;

  const metadata: ProfileMetadata[] = [];
  const selectedColors = Object.entries(vendor.colors)
    .filter(([k, v]) => k !== "specLinkColors" && v === true)
    .map(([k]) => k);
  if (selectedColors.length > 0) {
    metadata.push({label: "Socket links", value: selectedColors.join(", ")});
  }
  const selectedMov = [vendor.movement.ten ? "10%" : "", vendor.movement.fifteen ? "15%" : ""].filter(Boolean);
  if (selectedMov.length > 0) {
    metadata.push({label: "Movement speed", value: selectedMov.join(", ")});
  }
  const selectedGems = Object.entries(vendor.plusGems).filter(([, v]) => v).map(([k]) => `+1 ${k}`);
  if (selectedGems.length > 0) {
    metadata.push({label: "Gem modifiers", value: selectedGems.join(", ")});
  }
  const selectedWeapons = Object.entries(vendor.weapon).filter(([, v]) => v).map(([k]) => k);
  if (selectedWeapons.length > 0) {
    metadata.push({label: "Weapons", value: selectedWeapons.join(", ")});
  }

  return {
    pageKey: "vendor",
    pageLabel: "Vendor",
    route: "/vendor",
    score,
    metadata: metadata.length > 0 ? metadata : [{label: "Matched filters", value: branches.length}],
    settings: {...baseSettings, vendor},
  };
}

export function parseGemsRegex(
  input: string,
  baseSettings: SavedSettings,
  gemsCatalog?: GemsRegex,
): RegexImportCandidate<SavedSettings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0 || tokens.some((t) => t.negated)) return null;

  const gems: GemsSettings = structuredClone(defaultSettings.gems);
  const selected: number[] = [];
  const metadata: ProfileMetadata[] = [];
  let score = 0;

  for (const token of tokens) {
    if (token.value.startsWith("level: ")) {
      const range = parseNumberRangeFromRegex(token.value.slice("level: ".length), 1, 21);
      if (!range) return null;
      gems.levelEnabled = true;
      gems.levelMin = String(range.min);
      gems.levelMax = String(range.max);
      score += 4;
      metadata.push({label: "Gem level", value: `${gems.levelMin}–${gems.levelMax}`});
      continue;
    }

    if (token.value.startsWith("quality: \\+") && token.value.endsWith("%")) {
      const range = parseNumberRangeFromRegex(
        token.value.slice("quality: \\+".length, -1),
        0,
        23,
      );
      if (!range) return null;
      gems.qualityEnabled = true;
      gems.qualityMin = String(range.min);
      gems.qualityMax = String(range.max);
      score += 4;
      metadata.push({label: "Gem quality", value: `${gems.qualityMin}%–${gems.qualityMax}%`});
      continue;
    }

    if (!gemsCatalog) return null;
    const branches = splitTopLevelPipes(token.value);
    const matchedIds: number[] = [];
    for (const subTerm of branches) {
      const exact = gemsCatalog.tokens.filter((g) => g.regex === subTerm);
      if (exact.length > 0) {
        matchedIds.push(...exact.map((g) => g.id));
      } else {
        return null;
      }
    }
    selected.push(...matchedIds);
    score += branches.length * 2;
  }

  if (score === 0) return null;
  gems.selected = uniqueNumbers(selected);
  if (gems.selected.length > 0) {
    metadata.unshift({label: "Selected gems", value: gems.selected.length});
  }

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
          if (!excludedRewardIds.includes(r.id)) ultimatum.rewards.push(r.id);
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

  const metadata: ProfileMetadata[] = [];
  if (ultimatum.avoidModifiers.length > 0) {
    metadata.push({label: "Modifiers to avoid", value: ultimatum.avoidModifiers.length});
  }
  if (ultimatum.rewards.length > 0) {
    metadata.push({label: "Rewards", value: ultimatum.rewards.length});
  }
  if (ultimatum.sacrifices.length > 0) {
    metadata.push({label: "Sacrifices", value: ultimatum.sacrifices.length});
  }

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
        const inner = branch.slice(5, -1);
        const targetTerms = inner.split("|");
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
        const range = parseNumberRangeFromRegex(suffix.slice(2), 1, 5);
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

  const metadata: ProfileMetadata[] = [];
  if (matchedContracts > 0) {
    metadata.push({label: "Contract types", value: matchedContracts});
  }
  if (matchedTarget) {
    metadata.push({label: "Min target value", value: heist.targetValue});
  }

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
  const lang = baseSettings.language;
  const [mapMods, gems, ultimatum] = await Promise.all([
    loadMapMods(lang).catch(() => undefined),
    loadGems(lang).catch(() => undefined),
    loadUltimatum(lang).catch(() => undefined),
  ]);
  return parsePoe1RegexCandidates(input, baseSettings, {mapMods, gems, ultimatum}, currentPath);
}
