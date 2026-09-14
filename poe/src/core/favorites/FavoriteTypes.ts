export const POE1_FAVORITE_PAGE_KEYS = [
  "vendor",
  "maps",
  "boat",
  "items",
  "expedition",
  "heist",
  "beast",
  "tattoo",
  "runegraft",
  "scarab",
  "jewel",
  "gems",
] as const;

export type Poe1FavoritePageKey = (typeof POE1_FAVORITE_PAGE_KEYS)[number];

export interface FavoriteContextData {
  language?: string;
  league?: string;
}

interface FavoriteBaseRecord {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  hidden?: boolean;
}

export interface RegexFavoriteRecord extends FavoriteBaseRecord {
  kind: "favorite";
  pageKey: Poe1FavoritePageKey;
  regex: string;
  configuration: unknown;
  context: FavoriteContextData;
  languageDependent: boolean;
}

export interface StaticFavoriteRecord extends FavoriteBaseRecord {
  kind: "static";
  regex: string;
}

export interface FavoriteGroupRecord extends FavoriteBaseRecord {
  kind: "group";
  memberIds: string[];
  operator: "and" | "or";
}

export type FavoriteRecord =
  | RegexFavoriteRecord
  | StaticFavoriteRecord
  | FavoriteGroupRecord;
export const isRegexFavorite = (
  favorite: FavoriteRecord,
): favorite is RegexFavoriteRecord => favorite.kind === "favorite";
export const isGroupableFavorite = (
  favorite: FavoriteRecord,
): favorite is RegexFavoriteRecord | StaticFavoriteRecord =>
  favorite.kind !== "group";
export const isStaticFavorite = (
  favorite: FavoriteRecord,
): favorite is StaticFavoriteRecord => favorite.kind === "static";
export const isFavoriteGroup = (
  favorite: FavoriteRecord,
): favorite is FavoriteGroupRecord => favorite.kind === "group";

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
  languageDependent: boolean;
}

export const FAVORITE_COLORS = [
  "#c6930a",
  "#5fa8d6",
  "#69b578",
  "#d67575",
  "#a986d6",
  "#d68cb8",
] as const;
export const DEFAULT_FAVORITE_COLOR = FAVORITE_COLORS[0];
export const MAX_FAVORITE_TAGS = 10;
export const MAX_FAVORITE_TAG_LENGTH = 24;

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isFavoritePageKey = (
  value: unknown,
): value is Poe1FavoritePageKey =>
  typeof value === "string" &&
  (POE1_FAVORITE_PAGE_KEYS as readonly string[]).includes(value);

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
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : DEFAULT_FAVORITE_COLOR;

export const sanitizeFavoriteIcon = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const icon = Array.from(value.trim()).slice(0, 4).join("");
  return icon || undefined;
};

export const parseFavoriteRecord = (
  value: unknown,
): FavoriteRecord | undefined => {
  if (!isObject(value) || value.schemaVersion !== 1) return undefined;
  if (typeof value.id !== "string" || !value.id.trim()) return undefined;
  if (typeof value.name !== "string" || !value.name.trim()) return undefined;
  const createdAt =
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt))
      ? value.createdAt
      : new Date(0).toISOString();
  const updatedAt =
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
      ? value.updatedAt
      : createdAt;
  const base = {
    schemaVersion: 1 as const,
    id: value.id.trim(),
    name: value.name.trim(),
    description: typeof value.description === "string" ? value.description : "",
    color: sanitizeFavoriteColor(value.color),
    icon: sanitizeFavoriteIcon(value.icon),
    tags: normalizeFavoriteTags(
      Array.isArray(value.tags)
        ? value.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
    ),
    createdAt,
    updatedAt,
    hidden: value.hidden === true ? true : undefined,
  };
  if (value.kind === "group") {
    const memberIds = Array.isArray(value.memberIds)
      ? value.memberIds.flatMap((id) =>
          typeof id === "string" && id.trim() ? [id.trim()] : [],
        )
      : [];
    if (memberIds.length < 2 || new Set(memberIds).size !== memberIds.length)
      return undefined;
    if (value.operator !== "and" && value.operator !== "or") return undefined;
    return { ...base, kind: "group", memberIds, operator: value.operator };
  }
  if (value.kind === "static") {
    if (typeof value.regex !== "string" || !value.regex.trim())
      return undefined;
    return { ...base, kind: "static", regex: value.regex };
  }
  if (value.kind !== undefined && value.kind !== "favorite") return undefined;
  if (!isFavoritePageKey(value.pageKey)) return undefined;
  if (typeof value.regex !== "string" || !value.regex.trim()) return undefined;
  if (!("configuration" in value)) return undefined;

  const context = isObject(value.context) ? value.context : {};
  return {
    ...base,
    kind: "favorite",
    pageKey: value.pageKey,
    regex: value.regex,
    configuration: value.configuration,
    context: {
      language:
        typeof context.language === "string" ? context.language : undefined,
      league: typeof context.league === "string" ? context.league : undefined,
    },
    languageDependent:
      typeof value.languageDependent === "boolean"
        ? value.languageDependent
        : typeof context.language === "string",
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

export const cloneFavoriteConfiguration = <T>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

export const createFavoriteId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return `favorite-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};
