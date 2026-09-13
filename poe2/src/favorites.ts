import {
  cloneFavoriteConfiguration,
  createFavoriteId,
  FavoriteGroupOperator,
  FavoriteMetadata,
  normalizeFavoriteTags,
  sanitizeFavoriteColor,
  selectValidFavoriteGroupMembers,
} from "@shared/core/favorites/FavoriteTypes";
import {loadSettings, updateSettings} from "./localStorage";
import {
  Poe2FavoriteGroupRecord,
  Poe2FavoritePageKey,
  Poe2FavoriteRecord,
  Poe2RegexFavoriteRecord,
  Poe2StaticFavoriteRecord,
  Settings,
} from "./settings";

export interface FavoriteSnapshot {
  pageKey: Poe2FavoritePageKey;
  regex: string;
  configuration: unknown;
  context: {league?: string};
}

const favoritePageKeys: readonly Poe2FavoritePageKey[] = ["vendor", "waystone", "tablet", "relic", "item"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const isPoe2RegexFavorite = (favorite: Poe2FavoriteRecord): favorite is Poe2RegexFavoriteRecord => favorite.kind === "favorite";
export const isPoe2GroupableFavorite = (favorite: Poe2FavoriteRecord): favorite is Poe2RegexFavoriteRecord | Poe2StaticFavoriteRecord => favorite.kind !== "group";
export const isPoe2StaticFavorite = (favorite: Poe2FavoriteRecord): favorite is Poe2StaticFavoriteRecord => favorite.kind === "static";
export const isPoe2FavoriteGroup = (favorite: Poe2FavoriteRecord): favorite is Poe2FavoriteGroupRecord => favorite.kind === "group";

const isValidDate = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const metadataFrom = (metadata: FavoriteMetadata) => ({
  name: metadata.name.trim(),
  description: metadata.description.trim(),
  color: sanitizeFavoriteColor(metadata.color),
  tags: normalizeFavoriteTags(metadata.tags),
});

const parseFavorite = (item: unknown): Poe2FavoriteRecord | undefined => {
  if (!isObject(item)
    || item.schemaVersion !== 1
    || typeof item.id !== "string"
    || !item.id.trim()
    || typeof item.name !== "string"
    || !item.name.trim()) return undefined;

  const createdAt = isValidDate(item.createdAt) ? item.createdAt : new Date(0).toISOString();
  const updatedAt = isValidDate(item.updatedAt) ? item.updatedAt : createdAt;
  const base = {
    schemaVersion: 1 as const,
    id: item.id.trim(),
    name: item.name.trim(),
    description: typeof item.description === "string" ? item.description : "",
    color: sanitizeFavoriteColor(item.color),
    tags: normalizeFavoriteTags(Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : []),
    createdAt,
    updatedAt,
    hidden: item.hidden === true ? true as const : undefined,
  };

  if (item.kind === "group") {
    const memberIds = Array.isArray(item.memberIds)
      ? item.memberIds.flatMap((id) => typeof id === "string" && id.trim() ? [id.trim()] : [])
      : [];
    if (memberIds.length < 2
      || new Set(memberIds).size !== memberIds.length
      || (item.operator !== "and" && item.operator !== "or")) return undefined;
    return {...base, kind: "group", memberIds, operator: item.operator};
  }

  if (item.kind === "static") {
    if (typeof item.regex !== "string" || !item.regex.trim()) return undefined;
    return {...base, kind: "static", regex: item.regex};
  }

  if ((item.kind !== undefined && item.kind !== "favorite")
    || !favoritePageKeys.includes(item.pageKey as Poe2FavoritePageKey)
    || typeof item.regex !== "string"
    || !item.regex.trim()
    || !("configuration" in item)) return undefined;

  const context = isObject(item.context) ? item.context : {};
  return {
    ...base,
    kind: "favorite",
    pageKey: item.pageKey as Poe2FavoritePageKey,
    regex: item.regex,
    configuration: item.configuration,
    context: {league: typeof context.league === "string" ? context.league : undefined},
  };
};

export const parseFavorites = (raw: unknown): Poe2FavoriteRecord[] => {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  return raw.flatMap((item) => {
    const favorite = parseFavorite(item);
    if (!favorite || ids.has(favorite.id)) return [];
    ids.add(favorite.id);
    return [favorite];
  });
};

const listFrom = (settings: Settings): Poe2FavoriteRecord[] => parseFavorites(settings.favorites);
const timestamp = (): string => new Date().toISOString();

export const listFavorites = (profile: string): Poe2FavoriteRecord[] => listFrom(loadSettings(profile));

const appendFavorite = (profile: string, favorite: Poe2FavoriteRecord): void => {
  updateSettings(profile, (settings) => ({
    ...settings,
    favorites: [...listFrom(settings), favorite],
  }));
};

export const createFavorite = (profile: string, snapshot: FavoriteSnapshot, metadata: FavoriteMetadata): void => {
  const normalizedMetadata = metadataFrom(metadata);
  if (!snapshot.regex.trim() || !normalizedMetadata.name) throw new Error("A favorite needs a name and a non-empty regex");

  const now = timestamp();
  appendFavorite(profile, {
    schemaVersion: 1,
    kind: "favorite",
    id: createFavoriteId(),
    pageKey: snapshot.pageKey,
    ...normalizedMetadata,
    regex: snapshot.regex,
    configuration: cloneFavoriteConfiguration(snapshot.configuration),
    context: {...snapshot.context},
    createdAt: now,
    updatedAt: now,
  });
};

export const createStaticFavorite = (profile: string, regex: string, metadata: FavoriteMetadata): void => {
  const normalizedMetadata = metadataFrom(metadata);
  const normalizedRegex = regex.trim();
  if (!normalizedMetadata.name || !normalizedRegex) throw new Error("A static favorite needs a name and a non-empty regex");

  const now = timestamp();
  appendFavorite(profile, {
    schemaVersion: 1,
    kind: "static",
    id: createFavoriteId(),
    ...normalizedMetadata,
    regex: normalizedRegex,
    createdAt: now,
    updatedAt: now,
  });
};

export const createFavoriteGroup = (profile: string, ids: readonly string[], operator: FavoriteGroupOperator, metadata: FavoriteMetadata): void => {
  const normalizedMetadata = metadataFrom(metadata);
  if (!normalizedMetadata.name) throw new Error("A group needs a name.");

  const members = selectValidFavoriteGroupMembers(listFavorites(profile).filter(isPoe2GroupableFavorite), ids, operator);
  const now = timestamp();
  appendFavorite(profile, {
    schemaVersion: 1,
    kind: "group",
    id: createFavoriteId(),
    ...normalizedMetadata,
    memberIds: members.map((member) => member.id),
    operator,
    createdAt: now,
    updatedAt: now,
  });
};

export const setFavoriteHidden = (profile: string, id: string, hidden: boolean): void => {
  updateSettings(profile, (settings) => ({
    ...settings,
    favorites: listFrom(settings).map((favorite) => favorite.id === id ? {...favorite, hidden: hidden || undefined} : favorite),
  }));
};

export const updateFavoriteGroup = (profile: string, id: string, ids: readonly string[], operator: FavoriteGroupOperator, metadata: FavoriteMetadata): void => {
  const normalizedMetadata = metadataFrom(metadata);
  if (!normalizedMetadata.name) throw new Error("A group needs a name.");

  updateSettings(profile, (settings) => {
    const favorites = listFrom(settings);
    const target = favorites.find((favorite) => favorite.id === id);
    if (!target || !isPoe2FavoriteGroup(target)) throw new Error("Favorite group not found.");

    const members = selectValidFavoriteGroupMembers(favorites.filter(isPoe2GroupableFavorite), ids, operator);
    return {
      ...settings,
      favorites: favorites.map((favorite) => favorite.id === id ? {
        ...favorite,
        ...normalizedMetadata,
        memberIds: members.map((member) => member.id),
        operator,
        updatedAt: timestamp(),
      } : favorite),
    };
  });
};

export const updateFavorite = (profile: string, id: string, snapshot: FavoriteSnapshot): void => {
  updateSettings(profile, (settings) => ({
    ...settings,
    favorites: listFrom(settings).map((favorite) => favorite.id === id
      && isPoe2RegexFavorite(favorite)
      && favorite.pageKey === snapshot.pageKey
      ? {
        ...favorite,
        regex: snapshot.regex,
        configuration: cloneFavoriteConfiguration(snapshot.configuration),
        context: {...snapshot.context},
        updatedAt: timestamp(),
      }
      : favorite),
  }));
};

export const updateStaticFavorite = (profile: string, id: string, regex: string, metadata: FavoriteMetadata): void => {
  const normalizedMetadata = metadataFrom(metadata);
  const normalizedRegex = regex.trim();
  if (!normalizedMetadata.name || !normalizedRegex) throw new Error("A static favorite needs a name and a non-empty regex");

  updateSettings(profile, (settings) => {
    const favorites = listFrom(settings);
    const target = favorites.find((favorite) => favorite.id === id);
    if (!target || !isPoe2StaticFavorite(target)) throw new Error("Static favorite not found.");

    return {
      ...settings,
      favorites: favorites.map((favorite) => favorite.id === id ? {
        ...favorite,
        ...normalizedMetadata,
        regex: normalizedRegex,
        updatedAt: timestamp(),
      } : favorite),
    };
  });
};

export const updateFavoriteMetadata = (profile: string, id: string, metadata: FavoriteMetadata): void => {
  const normalizedMetadata = metadataFrom(metadata);
  if (!normalizedMetadata.name) throw new Error("Favorite name is required");

  updateSettings(profile, (settings) => ({
    ...settings,
    favorites: listFrom(settings).map((favorite) => favorite.id === id ? {
      ...favorite,
      ...normalizedMetadata,
      updatedAt: timestamp(),
    } : favorite),
  }));
};

export const removeFavorite = (profile: string, id: string): void => {
  updateSettings(profile, (settings) => {
    const favorites = listFrom(settings)
      .filter((favorite) => favorite.id !== id)
      .flatMap<Poe2FavoriteRecord>((favorite) => {
        if (!isPoe2FavoriteGroup(favorite)) return [favorite];
        const memberIds = favorite.memberIds.filter((memberId) => memberId !== id);
        return memberIds.length >= 2 ? [{...favorite, memberIds, updatedAt: timestamp()}] : [];
      });
    return {...settings, favorites};
  });
};

export const reorderFavorites = (profile: string, ids: readonly string[]): Poe2FavoriteRecord[] => {
  let reordered: Poe2FavoriteRecord[] = [];
  updateSettings(profile, (settings) => {
    const byId = new Map(listFrom(settings).map((favorite) => [favorite.id, favorite]));
    reordered = ids.flatMap((id) => {
      const favorite = byId.get(id);
      if (!favorite) return [];
      byId.delete(id);
      return [favorite];
    }).concat([...byId.values()]);
    return {...settings, favorites: reordered};
  });
  return reordered;
};

const duplicateName = (favorites: readonly Poe2FavoriteRecord[], sourceName: string): string => {
  const names = new Set(favorites.map((favorite) => favorite.name.toLocaleLowerCase()));
  const base = `${sourceName} copy`;
  if (!names.has(base.toLocaleLowerCase())) return base;

  for (let index = 2; index < 1000; index++) {
    const candidate = `${base} (${index})`;
    if (!names.has(candidate.toLocaleLowerCase())) return candidate;
  }
  return `${sourceName} ${createFavoriteId().slice(0, 8)}`;
};

export const duplicateFavorite = (profile: string, id: string): void => {
  updateSettings(profile, (settings) => {
    const favorites = listFrom(settings);
    const source = favorites.find((favorite) => favorite.id === id);
    if (!source) throw new Error("Favorite not found.");

    const now = timestamp();
    const duplicate = {
      ...source,
      id: createFavoriteId(),
      name: duplicateName(favorites, source.name),
      hidden: undefined,
      createdAt: now,
      updatedAt: now,
      ...(isPoe2RegexFavorite(source) ? {configuration: cloneFavoriteConfiguration(source.configuration), context: {...source.context}} : {}),
      ...(isPoe2FavoriteGroup(source) ? {memberIds: [...source.memberIds]} : {}),
    } as Poe2FavoriteRecord;

    return {
      ...settings,
      favorites: favorites.flatMap((favorite) => favorite.id === id ? [favorite, duplicate] : [favorite]),
    };
  });
};
