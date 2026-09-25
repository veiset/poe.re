import * as fs from 'fs';
import * as path from 'path';
import {fileURLToPath} from 'node:url';
import type {MapOption, RegexResult, Token} from '../poe/src/types/generated/mapmods/index';
import type {TabletOption} from '../poe2/src/types/generated/tablet/index';
import type {WaystoneOption} from '../poe2/src/types/generated/waystone/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STATS_API_URL = 'https://www.pathofexile.com/api/trade/data/stats';
const STATS_2_API_URL = 'https://www.pathofexile.com/api/trade2/data/stats';
const MAP_MODS_FILE = path.join(__dirname, '../poe/generated/mapmods/Generated.Map.ENGLISH.json');
const OUTPUT_FILE = path.join(__dirname, '../poe/src/generated/mapmods/trade/TradeStatIdMatching.json');

const WAYSTONE_FILE = path.join(__dirname, '../poe2/public/generated/waystone/Generated.Waystone.min.json');
const TABLET_FILE = path.join(__dirname, '../poe2/public/generated/tablet/Generated.Tablet.min.json');
const POE2_OUTPUT_DIR = path.join(__dirname, '../poe2/public/generated/trade');
const WAYSTONE_OUTPUT = path.join(POE2_OUTPUT_DIR, 'WaystoneTradeStatIds.json');
const TABLET_OUTPUT = path.join(POE2_OUTPUT_DIR, 'TabletTradeStatIds.json');

interface TradeStatEntry {
  id: string;
  text: string;
  type: string;
}

interface TradeStatGroup {
  id: string;
  label: string;
  entries: TradeStatEntry[];
}

interface TradeStatsResponse {
  result: TradeStatGroup[];
}

type MapModToken = Token<MapOption>;
type Poe2Token = Token<TabletOption> | Token<WaystoneOption>;

type MatchMode = 'exact' | 'fuzzy' | 'aggressive';

// PoE2 locatives: collapse "Area"/"Your Maps" to "Map" for matching.
function normalizePoe2(text: string, aggressive = false): string {
  let out = text
    .toLowerCase()
    .replace(/\([\D]*\)/g, '')
    .replace(/\^|\$/g, '')
    .replace(/\([^)]*\)/g, '#')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\+/g, '')
    .replace(/\b\d+%?\b/g, 'NUM')
    .replace(/##?%?/g, 'NUM')
    .replace(/\bnum\b/gi, 'NUM')
    .replace(/\byour maps?\b/g, 'map')
    .replace(/\bareas?\b/g, 'map')
    .replace(/\bmaps\b/g, 'map')
    .replace(/\bin map (?=\S)/g, ' ')
    .replace(/\bmap which contains? \w+ (?:have|has)\b/g, 'map has')
    .replace(/\bmap contain\b/g, 'map contains')
    .replace(/\bmap have\b/g, 'map has')
    .replace(/\bmap are\b/g, 'map is')
    .replace(/\bmap spawn\b/g, 'map spawns')
    .replace(/\bmap allow\b/g, 'map allows')
    .replace(/\bmap dissipate\b/g, 'map dissipates')
    .replace(/\ban additional\b/g, 'NUM additional')
    .replace(/\ba additional\b/g, 'NUM additional');

  if (aggressive) {
    // Trade texts are often the singular "1 X" form of a "(1-2) Xs" mod, or drop the count
    // entirely ("The first unearthed Runic Monster will be a Rare Monster"). Ignore counts and articles.
    out = out
      .replace(/\bin map\b/g, ' ')
      .replace(/\bexpedition\b/g, ' ')
      .replace(/\bNUM\b/g, ' ')
      .replace(/\b(a|an|the)\b/g, ' ');
  }

  return out
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Reduce common English plurals so "Strongboxes"/"Bosses"/"Sentries" compare equal to their singulars.
function depluralize(text: string): string {
  return text
    .replace(/ies(?=\s|$)/g, 'y')
    .replace(/(x|ch|sh|ss)es(?=\s|$)/g, '$1')
    .replace(/([^s])s(?=\s|$)/g, '$1');
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\^|\$/g, '')
    .replace(/\([^)]*\)/g, '#')
    .replace(/\+/g, '')
    .replace(/#%?/g, 'NUM')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textsMatch(generalizedText: string, tradeText: string, exactOnly: boolean): boolean {
  const alternatives = generalizedText.split('|');

  for (const alt of alternatives) {
    const normalizedMod = normalizeText(alt);
    const normalizedTrade = normalizeText(tradeText);

    if (normalizedMod === normalizedTrade) return true;
    if (depluralize(normalizedMod) === depluralize(normalizedTrade)) return true;

    if (exactOnly) continue;

    if (normalizedMod.includes(normalizedTrade) || normalizedTrade.includes(normalizedMod)) {
      const lenRatio = Math.min(normalizedMod.length, normalizedTrade.length) /
                       Math.max(normalizedMod.length, normalizedTrade.length);
      if (lenRatio > 0.7) return true;
    }

    const tradeWithoutChance = normalizedTrade
      .replace(/monsters have NUM chance to have a /i, 'monsters have ')
      .replace(/monsters have NUM chance to /i, 'monsters ')
      .replace(/players have NUM chance to be /i, 'players are ')
      .replace(/players have NUM chance to /i, 'players ');

    if (normalizedMod === tradeWithoutChance) return true;
    if (depluralize(normalizedMod) === depluralize(tradeWithoutChance)) return true;

    const mapModWithChance = normalizedMod.replace(/^monsters /, 'monsters have NUM chance to ');
    if (mapModWithChance === normalizedTrade) return true;

    const modWithPositive = normalizedMod
      .replace(/ less /g, ' more ')
      .replace(/ reduced /g, ' increased ');

    if (modWithPositive === normalizedTrade) return true;
  }

  return false;
}

function textsMatchPoe2(modText: string, tradeText: string, mode: MatchMode): boolean {
  if (mode === 'aggressive') {
    const normMod = normalizePoe2(modText, true);
    const normTrade = normalizePoe2(tradeText, true);
    return normMod === normTrade || depluralize(normMod) === depluralize(normTrade);
  }

  const normMod = normalizePoe2(modText);
  const normTrade = normalizePoe2(tradeText);

  if (normMod === normTrade) return true;
  if (depluralize(normMod) === depluralize(normTrade)) return true;

  if (mode === 'exact') return false;

  const tradeWithoutChance = normTrade
    .replace(/monsters have NUM chance to have a /i, 'monsters have ')
    .replace(/monsters have NUM chance to /i, 'monsters ')
    .replace(/players have NUM chance to be /i, 'players are ')
    .replace(/players have NUM chance to /i, 'players ');
  if (normMod === tradeWithoutChance) return true;
  if (depluralize(normMod) === depluralize(tradeWithoutChance)) return true;

  const modWithChance = normMod.replace(/^monsters /, 'monsters have NUM chance to ');
  if (modWithChance === normTrade) return true;

  const modPositive = normMod
    .replace(/ less /g, ' more ')
    .replace(/ reduced /g, ' increased ')
    .replace(/\bslower\b/g, 'faster');
  if (modPositive === normTrade) return true;
  if (depluralize(modPositive) === depluralize(normTrade)) return true;

  if (normMod.includes(normTrade) || normTrade.includes(normMod)) {
    const ratio = Math.min(normMod.length, normTrade.length) / Math.max(normMod.length, normTrade.length);
    if (ratio > 0.7) return true;
  }

  return false;
}

async function fetchTradeStats(apiUrl: string, userAgent: string): Promise<TradeStatEntry[]> {
  console.log(`Fetching trade stats from ${apiUrl}...`);

  const response = await fetch(apiUrl, {
    headers: { 'User-Agent': userAgent },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
  }

  const data: TradeStatsResponse = await response.json();
  const explicitGroup = data.result.find(group => group.id === 'explicit');

  if (!explicitGroup) {
    throw new Error('Could not find "explicit" stat group in API response');
  }

  console.log(`Found ${explicitGroup.entries.length} explicit stats`);
  return explicitGroup.entries;
}

function loadRegexResult<T>(file: string): RegexResult<T> {
  const data: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'));
  if (!data || typeof data !== 'object' || !Array.isArray((data as RegexResult<T>).tokens)) {
    throw new Error(`${file} does not look like a RegexResult (missing "tokens" array)`);
  }
  return data as RegexResult<T>;
}

function modClauses(token: Token<unknown>): string[] {
  const source = token.rawText || token.generalizedText || '';
  return source
    .split(/[\n|]/)
    .map((s: string) => s.trim())
    .filter(Boolean);
}

function findStatForPoe2Token(token: Poe2Token, tradeStats: TradeStatEntry[]): TradeStatEntry | null {
  const clauses = modClauses(token);

  for (const mode of ['exact', 'fuzzy', 'aggressive'] as MatchMode[]) {
    for (let i = clauses.length - 1; i >= 0; i--) {
      for (const stat of tradeStats) {
        if (textsMatchPoe2(clauses[i], stat.text, mode)) {
          return stat;
        }
      }
    }
  }
  return null;
}

function buildPoe2Mapping(label: string, tokens: Poe2Token[], tradeStats: TradeStatEntry[]) {
  const mapping: Record<string, string> = {};
  const unmatched: Poe2Token[] = [];

  for (const token of tokens) {
    const found = findStatForPoe2Token(token, tradeStats);
    if (found) {
      mapping[String(token.id)] = found.id;
    } else {
      unmatched.push(token);
    }
  }

  const matched = Object.keys(mapping).length;
  console.log(`\n[${label}] Matched: ${matched}/${tokens.length} (${((matched / Math.max(tokens.length, 1)) * 100).toFixed(1)}%)`);
  if (unmatched.length > 0) {
    console.log(`[${label}] Unmatched:`);
    for (const t of unmatched) {
      console.log(`  - id=${t.id}: ${t.rawText.replace(/\n/g, ' / ').slice(0, 100)}`);
    }
  }
  return mapping;
}

async function runPoe1(tradeStats: TradeStatEntry[]) {
  console.log(`Reading ${MAP_MODS_FILE}...`);
  const tokens: MapModToken[] = loadRegexResult<MapOption>(MAP_MODS_FILE).tokens;
  console.log(`Parsed ${tokens.length} tokens from map mods file`);

  console.log('\nMatching tokens to trade stats...\n');

  const mapping: Record<string, string> = {};
  const unmatched: MapModToken[] = [];

  for (const token of tokens) {
    let bestMatch: TradeStatEntry | null = null;

    for (const stat of tradeStats) {
      if (textsMatch(token.generalizedText, stat.text, true)) {
        bestMatch = stat;
        break;
      }
    }

    if (!bestMatch) {
      for (const stat of tradeStats) {
        if (textsMatch(token.generalizedText, stat.text, false)) {
          bestMatch = stat;
          break;
        }
      }
    }

    if (bestMatch) {
      mapping[token.id] = bestMatch.id;
      console.log(`✓ Matched: "${token.rawText.substring(0, 50)}..." -> ${bestMatch.id}`);
    } else {
      unmatched.push(token);
    }
  }

  const matchedCount = Object.keys(mapping).length;
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2) + '\n', 'utf-8');

  console.log('\n' + '='.repeat(60));
  console.log('PoE1 Results:');
  console.log(`  Matched: ${matchedCount}/${tokens.length} (${((matchedCount / tokens.length) * 100).toFixed(1)}%)`);
  console.log(`  Unmatched: ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log('\nUnmatched mods (generalizedText -> normalized):');
    unmatched.forEach(token => {
      console.log(`  - "${token.generalizedText}"`);
      console.log(`    normalized: "${normalizeText(token.generalizedText)}"`);
    });
  }
  console.log(`\nOutput: ${OUTPUT_FILE}`);
}

async function runPoe2(tradeStats: TradeStatEntry[]) {
  if (!fs.existsSync(POE2_OUTPUT_DIR)) {
    fs.mkdirSync(POE2_OUTPUT_DIR, { recursive: true });
  }

  const waystoneTokens = loadRegexResult<WaystoneOption>(WAYSTONE_FILE).tokens;
  console.log(`Parsed ${waystoneTokens.length} waystone tokens`);
  const tabletTokens = loadRegexResult<TabletOption>(TABLET_FILE).tokens;
  console.log(`Parsed ${tabletTokens.length} tablet tokens`);

  writeJson(WAYSTONE_OUTPUT, buildPoe2Mapping('waystone', waystoneTokens, tradeStats));
  writeJson(TABLET_OUTPUT, buildPoe2Mapping('tablet', tabletTokens, tradeStats));
}

function writeJson(filePath: string, mapping: Record<string, string>) {
  fs.writeFileSync(filePath, JSON.stringify(mapping, null, 2) + '\n', 'utf-8');
  console.log(`Output: ${filePath}`);
}

async function main() {
  try {
    // PoE1 uses the trade API; PoE2 uses trade2 endpoint. They return identical shapes today.
    const poe1Stats = await fetchTradeStats(STATS_API_URL, 'poe.re/1.0 (https://poe.re)');
    await runPoe1(poe1Stats);

    const poe2Stats = await fetchTradeStats(STATS_2_API_URL, 'poe.re/1.0 (https://poe.re)');
    await runPoe2(poe2Stats);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
