export interface FavoriteMetadata {
  name: string;
  description: string;
  color: string;
  tags: string[];
}

export const FAVORITE_COLORS = ["#c6930a", "#5fa8d6", "#69b578", "#d67575", "#a986d6", "#d68cb8"] as const;
export const DEFAULT_FAVORITE_COLOR = FAVORITE_COLORS[0];
export const MAX_FAVORITE_TAGS = 10;
export const MAX_FAVORITE_TAG_LENGTH = 24;

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

export const cloneFavoriteConfiguration = <T,>(value: T): T =>
  typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T;

export const createFavoriteId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `favorite-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
