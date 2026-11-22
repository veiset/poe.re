import {defaultEmptyVendor, defaultSettings, GroupCondition, SelectOption, Settings, VendorGroup} from "../settings";
import {numericRegexPosition} from "./SelectedOptionRegex";
import {loadRelicRegex, loadTabletAffixes, loadWaystoneAffixes, TabletAffix, WaystoneAffix} from "./loadData";
import {regexSearch} from "@poe/utils/regex/ReverseRegexLookup";
import {
  parseMinNumberFromRegex,
  parseNumberRangeFromRegex,
  parsePriceRangeToken,
  RegexImportCandidate,
  splitTopLevelPipes,
  tokenizeRegex,
  unwrapOuterParens,
} from "@shared/core/regex/ParseRegex";
import type {RelicRegex} from "@shared/typedefs/poe2/Relic";
import type {ProfileMetadata} from "@shared/components/profile/ProfileImportBox";

export interface Poe2RegexCatalogs {
  waystoneAffixes?: WaystoneAffix[];
  tabletAffixes?: TabletAffix[];
  relicAffixes?: RelicRegex[];
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
): { option: SelectOption; entry: T; exact: boolean } | null {
  if (!catalog || catalog.length === 0) return null;

  for (const entry of catalog) {
    if (entry.regex === subTerm) {
      return {
        entry,
        exact: true,
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

  for (const entry of catalog) {
    const pos = numericRegexPosition(entry);
    if (!pos) continue;
    let valRegex: string | undefined;
    if (pos === "before" && subTerm.startsWith(`${entry.regex}.*`)) {
      valRegex = subTerm.slice(entry.regex.length + 2);
    } else if (pos === "after" && subTerm.endsWith(`.*${entry.regex}`)) {
      valRegex = subTerm.slice(0, subTerm.length - entry.regex.length - 2);
    }
    if (valRegex && valRegex.endsWith("\\(")) {
      const range = parseNumberRangeFromRegex(valRegex, 0, 999, (n) => `${n}(`);
      if (range) {
        return {
          entry,
          exact: true,
          option: {
            ...(entry.id !== undefined ? {id: entry.id} : {}),
            name: entry.name,
            regex: entry.regex,
            ranges: entry.ranges,
            isSelected: true,
            value: range.min,
          },
        };
      }
    }
  }

  if (subTerm.length < 2) return null;
  const fuzzy = catalog.find((entry) =>
    regexSearch(entry.name.replaceAll("##", "10").replaceAll("#", "10"), subTerm),
  );
  if (fuzzy) {
    return {
      entry: fuzzy,
      exact: false,
      option: {
        ...(fuzzy.id !== undefined ? {id: fuzzy.id} : {}),
        name: fuzzy.name,
        regex: fuzzy.regex,
        ranges: fuzzy.ranges,
        isSelected: true,
        value: null,
      },
    };
  }

  return null;
}

function buildTierTokenValue(min: number, max: number): string | null {
  if (min < 1 || max < 1 || min > max) return null;
  if (min <= 1 && max === 16) return null;
  const range = (start: number, end: number) =>
    end <= start ? [] : Array.from({length: end - start}, (_, i) => i + start);
  const numbersUnder10 = range(min, Math.min(10, max + 1));
  const numbersOver10 = range(Math.max(10, min), max + 1);
  const regexUnder10 = numbersUnder10.length <= 1 ? numbersUnder10.join("") :
    numbersUnder10.length > 2 ? `[${numbersUnder10[0]}-${numbersUnder10[numbersUnder10.length - 1]}]` : `[${numbersUnder10.join("")}]`;
  const regexOver10 = numbersOver10.length <= 1 ? numbersOver10.join("") : `1[${numbersOver10.map((e) => e.toString()[1]).join("")}]`;
  const under10 = regexUnder10 === "" ? "" : `r ${regexUnder10}\\)`;
  const over10 = regexOver10 === "" ? "" : `${regexOver10}\\)`;
  const result = [under10, over10].filter(Boolean).join("|");
  return result === "" ? null : `er ${result}`;
}

function parseRarityTokenValue(value: string): { normal: boolean; magic: boolean; rare: boolean } | null {
  if (!value.startsWith("y: ")) return null;
  const inner = unwrapOuterParens(value.slice(3));
  const parts = inner.split("|").filter(Boolean);
  if (parts.length === 0 || !parts.every((p) => p === "n" || p === "m" || p === "r")) return null;
  return {
    normal: parts.includes("n"),
    magic: parts.includes("m"),
    rare: parts.includes("r"),
  };
}

export function parseWaystoneRegex(
  input: string,
  baseSettings: Settings,
  waystoneAffixes?: WaystoneAffix[],
): RegexImportCandidate<Settings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0) return null;

  const waystone: Settings["waystone"] = {
    ...structuredClone(defaultSettings.waystone),
    resultSettings: {
      ...baseSettings.waystone.resultSettings,
      customText: "",
      customTextEnabled: false,
    },
  };

  const quantDefs: Array<{
    key: "itemRarity" | "waystoneDropChance" | "monsterEffectiveness" | "monsterRarity" | "packSize";
    label: string;
    prefix: string;
  }> = [
    {key: "itemRarity", label: "Item rarity", prefix: "m rar.*"},
    {key: "waystoneDropChance", label: "Waystone drop chance", prefix: "p c.*"},
    {key: "monsterEffectiveness", label: "Monster effectiveness", prefix: "r ef.*"},
    {key: "monsterRarity", label: "Monster rarity", prefix: "r rar.*"},
    {key: "packSize", label: "Pack size", prefix: "k s.*"},
  ];

  let score = 0;
  let wantedTokensCount = 0;
  let pipeJoinedWanted = false;
  const leftoverTokens: string[] = [];
  const metadata: ProfileMetadata[] = [];

  for (const token of tokens) {
    // 1. Price range
    const price = parsePriceRangeToken(token, ["exalted", "divine"] as const);
    if (price) {
      waystone.asyncPriceRange = {...price, enabled: true, tradeEnabled: false};
      score += 3;
      metadata.push({label: "Price range", value: `${price.min}–${price.max} ${price.currency}`});
      continue;
    }

    // 2. State
    if (!token.negated && token.value === "delir") {
      waystone.state.delirious = true;
      score += 4;
      metadata.push({label: "Delirious", value: "Yes"});
      continue;
    }
    if (token.value === "corr") {
      if (token.negated) {
        waystone.state.uncorrupted = true;
        waystone.state.corrupted = false;
        metadata.push({label: "State", value: "Uncorrupted"});
      } else {
        waystone.state.corrupted = true;
        waystone.state.uncorrupted = false;
        metadata.push({label: "State", value: "Corrupted"});
      }
      score += 4;
      continue;
    }

    // 3. Rarity
    if (!token.negated) {
      const rarity = parseRarityTokenValue(token.value);
      if (rarity) {
        waystone.rarity = rarity;
        score += 2;
        const labels = [rarity.rare ? "Rare" : "", rarity.magic ? "Magic" : "", rarity.normal ? "Normal" : ""].filter(Boolean);
        metadata.push({label: "Rarity", value: labels.join(", ")});
        continue;
      }

      // 4. Tier
      if (token.value.startsWith("er ")) {
        let matchedTier: { min: number; max: number } | undefined;
        for (let min = 1; min <= 16 && !matchedTier; min++) {
          for (let max = min; max <= 16; max++) {
            if (buildTierTokenValue(min, max) === token.value) {
              matchedTier = {min, max};
              break;
            }
          }
        }
        if (!matchedTier) {
          const range = parseNumberRangeFromRegex(token.value, 1, 16, (n) => `er ${n})`);
          if (range) matchedTier = range;
        }
        if (matchedTier) {
          waystone.tier = matchedTier;
          score += 4;
          metadata.push({label: "Tier", value: `${matchedTier.min}–${matchedTier.max}`});
          continue;
        }
      }

      // 5. Revives
      if (token.value.startsWith("le: ")) {
        const range = parseNumberRangeFromRegex(token.value.slice(4), 0, 6);
        if (range) {
          waystone.revives = range;
          score += 4;
          metadata.push({label: "Revives", value: `${range.min}–${range.max}`});
          continue;
        }
      }

      // 6. Quantifiers
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

    // 7. Unwanted mods
    if (token.negated) {
      let matched = 0;
      for (const subTerm of branches) {
        const modMatch = matchAffixSubTerm(subTerm, waystoneAffixes);
        if (modMatch) {
          if (!waystone.modifier.unwantedMods.some((m) => m.name === modMatch.option.name)) {
            waystone.modifier.unwantedMods.push(modMatch.option);
          }
          matched++;
          score += modMatch.exact ? 3 : 2;
        }
      }
      if (matched === 0) leftoverTokens.push(token.raw);
      continue;
    }

    // 8. Wanted mods
    const matchedWanted: SelectOption[] = [];
    let tokenScore = 0;
    for (const subTerm of branches) {
      const modMatch = matchAffixSubTerm(subTerm, waystoneAffixes);
      if (modMatch) {
        matchedWanted.push(modMatch.option);
        tokenScore += modMatch.exact ? 3 : 1;
      }
    }
    if (matchedWanted.length === branches.length && matchedWanted.length > 0) {
      for (const opt of matchedWanted) {
        if (!waystone.modifier.wantedMods.some((m) => m.name === opt.name)) {
          waystone.modifier.wantedMods.push(opt);
        }
      }
      wantedTokensCount++;
      if (branches.length > 1) pipeJoinedWanted = true;
      score += tokenScore;
    } else {
      leftoverTokens.push(token.raw);
    }
  }

  if (wantedTokensCount > 1 && !pipeJoinedWanted) {
    waystone.modifier.wantedModsSelectType = "all";
  } else if (wantedTokensCount >= 1) {
    waystone.modifier.wantedModsSelectType = "any";
  }

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

export function parseTabletRegex(
  input: string,
  baseSettings: Settings,
  tabletAffixes?: TabletAffix[],
): RegexImportCandidate<Settings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0 || tokens.some((t) => t.negated)) return null;

  const tablet: Settings["tablet"] = {
    ...structuredClone(defaultSettings.tablet),
    resultSettings: {
      ...baseSettings.tablet.resultSettings,
      customText: "",
      customTextEnabled: false,
    },
  };

  const tabletTypeMap: Record<string, keyof Settings["tablet"]["type"]> = {
    rra: "irradiated",
    tual: "ritual",
    liri: "delirium",
    eac: "breach",
    byss: "abyss",
    empl: "temple",
    eer: "overseer",
    xped: "expedition",
  };

  let score = 0;
  let affixTokensCount = 0;
  let pipeJoinedAffixes = false;
  const leftoverTokens: string[] = [];
  const metadata: ProfileMetadata[] = [];

  for (const token of tokens) {
    // 1. Price range
    const price = parsePriceRangeToken(token, ["exalted", "divine"] as const);
    if (price) {
      tablet.asyncPriceRange = {...price, enabled: true, tradeEnabled: false};
      score += 3;
      metadata.push({label: "Price range", value: `${price.min}–${price.max} ${price.currency}`});
      continue;
    }

    // 2. Rarity
    const rarity = parseRarityTokenValue(token.value);
    if (rarity) {
      tablet.rarity = rarity;
      score += 2;
      const labels = [rarity.rare ? "Rare" : "", rarity.magic ? "Magic" : "", rarity.normal ? "Normal" : ""].filter(Boolean);
      metadata.push({label: "Rarity", value: labels.join(", ")});
      continue;
    }

    // 3. Uses remaining: "(...) us"
    if (token.value.endsWith(" us")) {
      const numPattern = token.value.slice(0, -3);
      const range = parseNumberRangeFromRegex(numPattern, 1, 18);
      if (range) {
        tablet.modifier.usesRemaining = true;
        tablet.modifier.numUsesRemaining = range.min;
        score += 4;
        metadata.push({label: "Min uses remaining", value: range.min});
        continue;
      }
    }

    // 4. Tablet types: "(rra|tual)" or "(tual)"
    const unwrapped = unwrapOuterParens(token.value);
    const typeParts = unwrapped.split("|").filter(Boolean);
    if (
      (token.value.startsWith("(") || typeParts.length > 1 || !(tabletAffixes?.some((a) => a.regex === token.value))) &&
      typeParts.length > 0 &&
      typeParts.every((p) => p in tabletTypeMap)
    ) {
      for (const part of typeParts) {
        tablet.type[tabletTypeMap[part]] = true;
      }
      score += typeParts.length * 4;
      metadata.push({
        label: "Tablet types",
        value: typeParts.map((p) => tabletTypeMap[p]).join(", "),
      });
      continue;
    }

    // 5. Affixes
    const branches = splitTopLevelPipes(token.value);
    const matchedAffixes: SelectOption[] = [];
    let tokenScore = 0;
    for (const subTerm of branches) {
      const modMatch = matchAffixSubTerm(subTerm, tabletAffixes);
      if (modMatch) {
        matchedAffixes.push(modMatch.option);
        tokenScore += modMatch.exact ? 3 : 1;
      }
    }
    if (matchedAffixes.length === branches.length && matchedAffixes.length > 0) {
      for (const opt of matchedAffixes) {
        if (!tablet.modifier.affixes.some((a) => a.name === opt.name)) {
          tablet.modifier.affixes.push(opt);
        }
      }
      affixTokensCount++;
      if (branches.length > 1) pipeJoinedAffixes = true;
      score += tokenScore;
    } else {
      leftoverTokens.push(token.raw);
    }
  }

  if (affixTokensCount > 1 && !pipeJoinedAffixes) {
    tablet.modifier.affixSelectType = "all";
  } else {
    tablet.modifier.affixSelectType = "any";
  }

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
    let tokenMatchedAll = true;
    const tokenMatches: Array<{ option: SelectOption; entry: RelicRegex; exact: boolean }> = [];
    for (const subTerm of branches) {
      const m = matchAffixSubTerm(subTerm, relicAffixes);
      if (!m) {
        tokenMatchedAll = false;
        break;
      }
      tokenMatches.push(m);
    }
    if (!tokenMatchedAll || tokenMatches.length === 0) return null;
    matchedTokenCount++;
    for (const {option, entry, exact} of tokenMatches) {
      const targetList = entry.affix === "PREFIX" ? relic.modifier.prefixes : relic.modifier.suffixes;
      if (!targetList.some((item) => item.name === option.name)) {
        targetList.push(option);
      }
      score += exact ? 3 : 1;
    }
  }

  if (score === 0) return null;
  relic.matchType = matchedTokenCount > 1 && relic.modifier.prefixes.length > 0 && relic.modifier.suffixes.length > 0
    ? "both"
    : "any";

  const metadata: ProfileMetadata[] = [];
  if (relic.modifier.prefixes.length > 0) {
    metadata.push({label: "Prefix modifiers", value: relic.modifier.prefixes.length});
  }
  if (relic.modifier.suffixes.length > 0) {
    metadata.push({label: "Suffix modifiers", value: relic.modifier.suffixes.length});
  }
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

export function parsePoe2VendorRegex(
  input: string,
  baseSettings: Settings,
): RegexImportCandidate<Settings> | null {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0 || tokens.some((t) => t.negated)) return null;

  const itemClassMap: Record<string, keyof VendorGroup["itemClass"]> = {
    am: "amulets",
    ri: "rings",
    be: "belts",
    da: "daggers",
    wa: "wands",
    on: "oneHandMaces",
    sc: "sceptres",
    bow: "bows",
    st: "staves",
    tw: "twoHandMaces",
    qua: "quarterstaves",
    spe: "spears",
    cr: "crossbows",
    tali: "talisman",
    gl: "gloves",
    boo: "boots",
    bod: "bodyArmours",
    he: "helmets",
    qui: "quivers",
    fo: "foci",
    sh: "shields",
    bu: "bucklers",
  };

  const directModMap: Record<string, keyof VendorGroup["itemMods"]> = {
    "ph.*da": "physical",
    "ell.*ge$": "spellDamage",
    "^\\+.*ills$": "skillLevel",
    "^\\+.*ion skills$": "skillLevelMinion",
    "^\\+.*ee skills$": "skillLevelMelee",
    "^\\+.*all sp.*ls$": "skillLevelSpell",
    "^\\+.*re sp.*ls$": "skillLevelFire",
    "^\\+.*ld sp.*ls$": "skillLevelCold",
    "^\\+.*ng sp.*ls$": "skillLevelLightning",
    "^\\+.*os sp.*ls$": "skillLevelChaos",
    "^\\+.*al sp.*ls$": "skillLevelPhysical",
    "^\\+.*ile skills$": "skillLevelProjectile",
    "o sp": "spirit",
    "d rari": "rarity",
    "ck spe": "attackSpeed",
    "st spe": "castSpeed",
    "\\d.+m life": "maxLife",
    "\\d.+mana": "maxMana",
  };

  type CategoryTag =
    | "quality" | "sockets" | "itemType" | "itemLevel" | "characterLevel"
    | "resistances" | "movementSpeed" | "itemClass" | "eleDamage" | "attributes"
    | `mod:${keyof VendorGroup["itemMods"]}`;

  const parseSubTerm = (subTerm: string, target: VendorGroup): CategoryTag | null => {
    if (subTerm === "y: \\+") {
      target.itemProperty.quality = true;
      return "quality";
    }
    if (subTerm === "ts: S") {
      target.itemProperty.sockets = true;
      return "sockets";
    }
    const rarity = parseRarityTokenValue(subTerm);
    if (rarity) {
      target.itemType = rarity;
      return "itemType";
    }
    if (subTerm.startsWith("m level: (") && subTerm.endsWith(")\\b")) {
      const inner = subTerm.slice("m level: (".length, -3);
      const range = parseNumberRangeFromRegex(inner, 0, 99);
      if (range) {
        target.itemLevel = {
          min: range.min === 0 ? "" : String(range.min),
          max: range.max === 99 ? "" : String(range.max),
        };
        return "itemLevel";
      }
    }
    if (subTerm.startsWith("s: level (") && subTerm.endsWith(")\\b")) {
      const inner = subTerm.slice("s: level (".length, -3);
      const range = parseNumberRangeFromRegex(inner, 0, 99);
      if (range) {
        target.characterLevel = {
          min: range.min === 0 ? "" : String(range.min),
          max: range.max === 99 ? "" : String(range.max),
        };
        return "characterLevel";
      }
    }
    if (subTerm.endsWith(" res")) {
      const inner = unwrapOuterParens(subTerm.slice(0, -4));
      const parts = inner.split("|");
      if (parts.length > 0 && parts.every((p) => p === "re" || p === "ld" || p === "ng" || p === "os")) {
        for (const p of parts) {
          if (p === "re") target.resistances.fire = true;
          if (p === "ld") target.resistances.cold = true;
          if (p === "ng") target.resistances.lightning = true;
          if (p === "os") target.resistances.chaos = true;
        }
        return "resistances";
      }
    }
    if (subTerm.endsWith("% i.+mov")) {
      const numPattern = subTerm.slice(0, -"% i.+mov".length);
      try {
        const re = new RegExp(`^(?:${numPattern})$`);
        let matchedAny = false;
        for (const speed of [10, 15, 20, 25, 30] as const) {
          if (re.test(String(speed))) {
            target.movementSpeed[`move${speed}`] = true;
            matchedAny = true;
          }
        }
        if (matchedAny) return "movementSpeed";
      } catch {
        return null;
      }
    }
    if (subTerm in directModMap) {
      const modKey = directModMap[subTerm];
      target.itemMods[modKey] = true;
      return `mod:${modKey}`;
    }
    if (subTerm.startsWith("\\d ") && subTerm.endsWith(".+da")) {
      const inner = unwrapOuterParens(subTerm.slice(3, -4));
      if (inner === "[cfl]") {
        target.itemMods.elemental = true;
        return "eleDamage";
      }
      const parts = inner.split("|");
      if (parts.length > 0 && parts.every((p) => p === "co" || p === "ch" || p === "f" || p === "l")) {
        for (const p of parts) {
          if (p === "co") target.itemMods.coldDamage = true;
          if (p === "ch") target.itemMods.chaosDamage = true;
          if (p === "f") target.itemMods.fireDamage = true;
          if (p === "l") target.itemMods.lightningDamage = true;
        }
        return "eleDamage";
      }
    }
    if (subTerm.startsWith("o (all a|") && subTerm.endsWith(")")) {
      const inner = subTerm.slice("o (all a|".length, -1);
      const parts = inner.split("|");
      if (parts.length > 0 && parts.every((p) => p === "str" || p === "d" || p === "int")) {
        for (const p of parts) {
          if (p === "str") target.itemMods.strength = true;
          if (p === "d") target.itemMods.dexterity = true;
          if (p === "int") target.itemMods.intelligence = true;
        }
        return "attributes";
      }
    }
    if (subTerm.startsWith("s: ")) {
      const inner = unwrapOuterParens(subTerm.slice(3));
      const parts = inner.split("|");
      if (parts.length > 0 && parts.every((p) => p in itemClassMap)) {
        for (const p of parts) {
          target.itemClass[itemClassMap[p]] = true;
        }
        return "itemClass";
      }
    }
    return null;
  };

  const groups: VendorGroup[] = [];
  let currentAndGroup: { group: VendorGroup; usedTags: Set<CategoryTag> } | null = null;
  const leftoverTokens: string[] = [];
  let score = 0;
  let totalTermsMatched = 0;

  for (const token of tokens) {
    const branches = splitTopLevelPipes(token.value);
    const probeGroup: VendorGroup = structuredClone(defaultEmptyVendor);
    const tags: CategoryTag[] = [];
    let allMatched = true;
    for (const branch of branches) {
      const tag = parseSubTerm(branch, probeGroup);
      if (!tag) {
        allMatched = false;
        break;
      }
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

  if (currentAndGroup) {
    groups.push(currentAndGroup.group);
  }

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

  const metadata: ProfileMetadata[] = [
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
  const lang = baseSettings.language;
  const [waystoneAffixes, tabletAffixes, relicAffixes] = await Promise.all([
    loadWaystoneAffixes(lang).catch(() => undefined),
    loadTabletAffixes(lang).catch(() => undefined),
    loadRelicRegex(lang).catch(() => undefined),
  ]);
  return parsePoe2RegexCandidates(input, baseSettings, {waystoneAffixes, tabletAffixes, relicAffixes}, currentPath);
}
