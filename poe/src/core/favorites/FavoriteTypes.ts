export const POE1_FAVORITE_PAGE_KEYS = [
  "vendor", "maps", "boat", "items", "expedition", "heist",
  "beast", "tattoo", "runegraft", "scarab", "jewel",
] as const;

export type Poe1FavoritePageKey = typeof POE1_FAVORITE_PAGE_KEYS[number];

export interface FavoriteContextData { language?: string; league?: string }

export interface FavoriteRecord {
  schemaVersion: 1;
  id: string;
  pageKey: Poe1FavoritePageKey;
  name: string;
  description: string;
  color: string;
  icon?: string;
  tags: string[];
  regex: string;
  configuration: unknown;
  context: FavoriteContextData;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteMetadata {
  name: string;
  description: string;
  color: string;
  icon?: string;
  tags: string[];
}

export interface FavoriteSnapshot {
  pageKey: Poe1FavoritePageKey;
  regex: string;
  configuration: unknown;
  context: FavoriteContextData;
}

export const FAVORITE_COLORS = ["#c6930a", "#5fa8d6", "#69b578", "#d67575", "#a986d6", "#d68cb8"] as const;
export const DEFAULT_FAVORITE_COLOR = FAVORITE_COLORS[0];
export const MAX_FAVORITE_TAGS = 10;
export const MAX_FAVORITE_TAG_LENGTH = 24;

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isFavoritePageKey = (value: unknown): value is Poe1FavoritePageKey =>
  typeof value === "string" && (POE1_FAVORITE_PAGE_KEYS as readonly string[]).includes(value);

export const normalizeFavoriteTags = (tags: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of tags) {
    const tag = value.trim().slice(0, MAX_FAVORITE_TAG_LENGTH);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length === MAX_FAVORITE_TAGS) break;
  }
  return result;
};

export const sanitizeFavoriteColor = (value: unknown): string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_FAVORITE_COLOR;

export const sanitizeFavoriteIcon = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const icon = Array.from(value.trim()).slice(0, 4).join("");
  return icon || undefined;
};

export const parseFavoriteRecord = (value: unknown): FavoriteRecord | undefined => {
  if (!isObject(value) || value.schemaVersion !== 1 || !isFavoritePageKey(value.pageKey)) return undefined;
  if (typeof value.id !== "string" || !value.id.trim()) return undefined;
  if (typeof value.name !== "string" || !value.name.trim()) return undefined;
  if (typeof value.regex !== "string" || !value.regex.trim() || !("configuration" in value)) return undefined;
  const context = isObject(value.context) ? value.context : {};
  const createdAt = typeof value.createdAt === "string" && !Number.isNaN(Date.parse(value.createdAt)) ? value.createdAt : new Date(0).toISOString();
  const updatedAt = typeof value.updatedAt === "string" && !Number.isNaN(Date.parse(value.updatedAt)) ? value.updatedAt : createdAt;
  return {
    schemaVersion: 1,
    id: value.id.trim(),
    pageKey: value.pageKey,
    name: value.name.trim().slice(0, 80),
    description: typeof value.description === "string" ? value.description.slice(0, 1000) : "",
    color: sanitizeFavoriteColor(value.color),
    icon: sanitizeFavoriteIcon(value.icon),
    tags: normalizeFavoriteTags(Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === "string") : []),
    regex: value.regex,
    configuration: value.configuration,
    context: {
      language: typeof context.language === "string" ? context.language : undefined,
      league: typeof context.league === "string" ? context.league : undefined,
    },
    createdAt,
    updatedAt,
  };
};

export const parseFavoriteRecords = (value: unknown): FavoriteRecord[] => {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((candidate) => {
    const record = parseFavoriteRecord(candidate);
    if (!record || ids.has(record.id)) return [];
    ids.add(record.id);
    return [record];
  });
};

export const cloneFavoriteConfiguration = <T,>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

export const createFavoriteId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `favorite-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};
