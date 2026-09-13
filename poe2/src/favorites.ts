import {cloneFavoriteConfiguration, createFavoriteId, FavoriteMetadata, normalizeFavoriteTags, sanitizeFavoriteColor} from "@shared/core/favorites/FavoriteTypes";
import {loadSettings, updateSettings} from "./localStorage";
import {Poe2FavoriteGroupRecord, Poe2FavoritePageKey, Poe2FavoriteRecord, Poe2RegexFavoriteRecord, Poe2StaticFavoriteRecord, Settings} from "./settings";
import {FavoriteGroupOperator, selectValidFavoriteGroupMembers} from "@shared/core/favorites/FavoriteTypes";

export interface FavoriteSnapshot { pageKey: Poe2FavoritePageKey; regex: string; configuration: unknown; context: {league?: string} }
const keys: readonly Poe2FavoritePageKey[] = ["vendor", "waystone", "tablet", "relic", "item"];
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
export const isPoe2RegexFavorite = (favorite: Poe2FavoriteRecord): favorite is Poe2RegexFavoriteRecord => favorite.kind === "favorite";
export const isPoe2GroupableFavorite = (favorite: Poe2FavoriteRecord): favorite is Poe2RegexFavoriteRecord | Poe2StaticFavoriteRecord => favorite.kind !== "group";
export const isPoe2StaticFavorite = (favorite: Poe2FavoriteRecord): favorite is Poe2StaticFavoriteRecord => favorite.kind === "static";
export const isPoe2FavoriteGroup = (favorite: Poe2FavoriteRecord): favorite is Poe2FavoriteGroupRecord => favorite.kind === "group";

const parseFavorite = (item: unknown): Poe2FavoriteRecord | undefined => {
  if (!isObject(item) || item.schemaVersion !== 1 || typeof item.id !== "string" || !item.id.trim() || typeof item.name !== "string" || !item.name.trim()) return undefined;
  const createdAt = typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt)) ? item.createdAt : new Date(0).toISOString();
  const updatedAt = typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt)) ? item.updatedAt : createdAt;
  const base = {
    schemaVersion: 1 as const,
    id: item.id.trim(),
    name: item.name.trim().slice(0, 80),
    description: typeof item.description === "string" ? item.description.slice(0, 1000) : "",
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
    if (memberIds.length < 2 || new Set(memberIds).size !== memberIds.length || (item.operator !== "and" && item.operator !== "or")) return undefined;
    return {...base, kind: "group", memberIds, operator: item.operator};
  }
  if (item.kind === "static") {
    if (typeof item.regex !== "string" || !item.regex.trim()) return undefined;
    return {...base, kind: "static", regex: item.regex};
  }
  if ((item.kind !== undefined && item.kind !== "favorite") || !keys.includes(item.pageKey as Poe2FavoritePageKey) || typeof item.regex !== "string" || !item.regex.trim() || !("configuration" in item)) return undefined;
  const context = isObject(item.context) ? item.context : {};
  return {...base, kind: "favorite", pageKey: item.pageKey as Poe2FavoritePageKey, regex: item.regex, configuration: item.configuration, context: {league: typeof context.league === "string" ? context.league : undefined}};
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
export const listFavorites = (profile: string): Poe2FavoriteRecord[] => parseFavorites(loadSettings(profile).favorites);
export const createFavorite = (profile: string, snapshot: FavoriteSnapshot, metadata: FavoriteMetadata) => {
  if (!snapshot.regex.trim() || !metadata.name.trim()) throw new Error("A favorite needs a name and a non-empty regex");
  const now = new Date().toISOString();
  const record: Poe2RegexFavoriteRecord = {schemaVersion: 1, kind: "favorite", id: createFavoriteId(), pageKey: snapshot.pageKey, name: metadata.name.trim().slice(0, 80), description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), tags: normalizeFavoriteTags(metadata.tags), regex: snapshot.regex, configuration: cloneFavoriteConfiguration(snapshot.configuration), context: {...snapshot.context}, createdAt: now, updatedAt: now};
  updateSettings(profile, (settings) => ({...settings, favorites: [...listFrom(settings), record]}));
};
export const createStaticFavorite = (profile: string, regex: string, metadata: FavoriteMetadata) => {
  const name = metadata.name.trim().slice(0, 80);
  const normalizedRegex = regex.trim();
  if (!name || !normalizedRegex) throw new Error("A static favorite needs a name and a non-empty regex");
  const now = new Date().toISOString();
  const record: Poe2StaticFavoriteRecord = {schemaVersion: 1, kind: "static", id: createFavoriteId(), name, description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), tags: normalizeFavoriteTags(metadata.tags), regex: normalizedRegex, createdAt: now, updatedAt: now};
  updateSettings(profile, (settings) => ({...settings, favorites: [...listFrom(settings), record]}));
};
export const createFavoriteGroup = (profile: string, ids: readonly string[], operator: FavoriteGroupOperator, metadata: FavoriteMetadata) => {
  const members = selectValidFavoriteGroupMembers(listFavorites(profile).filter(isPoe2GroupableFavorite), ids, operator);
  const now = new Date().toISOString();
  const record: Poe2FavoriteGroupRecord = {schemaVersion: 1, kind: "group", id: createFavoriteId(), name: metadata.name.trim().slice(0, 80), description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), tags: normalizeFavoriteTags(metadata.tags), memberIds: members.map((member) => member.id), operator, createdAt: now, updatedAt: now};
  if (!record.name) throw new Error("A group needs a name.");
  updateSettings(profile, (settings) => ({...settings, favorites: [...listFrom(settings), record]}));
};
export const setFavoriteHidden = (profile: string, id: string, hidden: boolean) => updateSettings(profile, (settings) => ({...settings, favorites: listFrom(settings).map((favorite) => favorite.id === id ? {...favorite, hidden: hidden || undefined} : favorite)}));
export const updateFavoriteGroup = (profile: string, id: string, ids: readonly string[], operator: FavoriteGroupOperator, metadata: FavoriteMetadata) => updateSettings(profile, (settings) => {
  const name = metadata.name.trim().slice(0, 80);
  if (!name) throw new Error("A group needs a name.");
  const favorites = listFrom(settings);
  const target = favorites.find((favorite) => favorite.id === id);
  if (!target || !isPoe2FavoriteGroup(target)) throw new Error("Favorite group not found.");
  const members = selectValidFavoriteGroupMembers(favorites.filter(isPoe2GroupableFavorite), ids, operator);
  return {...settings, favorites: favorites.map((favorite) => favorite.id === id ? {...favorite, memberIds: members.map((member) => member.id), operator, name, description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), tags: normalizeFavoriteTags(metadata.tags), updatedAt: new Date().toISOString()} : favorite)};
});
const listFrom = (settings: Settings) => parseFavorites(settings.favorites);
export const updateFavorite = (profile: string, favoriteId: string, snapshot: FavoriteSnapshot) => updateSettings(profile, (settings) => ({...settings, favorites: listFrom(settings).map((favorite) => favorite.id === favoriteId && isPoe2RegexFavorite(favorite) && favorite.pageKey === snapshot.pageKey ? {...favorite, regex: snapshot.regex, configuration: cloneFavoriteConfiguration(snapshot.configuration), context: {...snapshot.context}, updatedAt: new Date().toISOString()} : favorite)}));
export const updateStaticFavorite = (profile: string, favoriteId: string, regex: string, metadata: FavoriteMetadata) => {
  const name = metadata.name.trim().slice(0, 80);
  const normalizedRegex = regex.trim();
  if (!name || !normalizedRegex) throw new Error("A static favorite needs a name and a non-empty regex");
  return updateSettings(profile, (settings) => {
    const favorites = listFrom(settings);
    const target = favorites.find((favorite) => favorite.id === favoriteId);
    if (!target || !isPoe2StaticFavorite(target)) throw new Error("Static favorite not found.");
    return {...settings, favorites: favorites.map((favorite) => {
      if (favorite.id !== favoriteId) return favorite;
      return {...favorite, regex: normalizedRegex, name, description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), tags: normalizeFavoriteTags(metadata.tags), updatedAt: new Date().toISOString()};
    })};
  });
};
export const updateFavoriteMetadata = (profile: string, favoriteId: string, metadata: FavoriteMetadata) => {
  const name = metadata.name.trim().slice(0, 80);
  if (!name) throw new Error("Favorite name is required");
  return updateSettings(profile, (settings) => ({...settings, favorites: listFrom(settings).map((favorite) => favorite.id === favoriteId ? {...favorite, name, description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), tags: normalizeFavoriteTags(metadata.tags), updatedAt: new Date().toISOString()} : favorite)}));
};
export const removeFavorite = (profile: string, favoriteId: string) => updateSettings(profile, (settings) => ({...settings, favorites: listFrom(settings).filter((favorite) => favorite.id !== favoriteId).flatMap<Poe2FavoriteRecord>((favorite) => { if (!isPoe2FavoriteGroup(favorite)) return [favorite]; const memberIds = favorite.memberIds.filter((id) => id !== favoriteId); return memberIds.length >= 2 ? [{...favorite, memberIds, updatedAt: new Date().toISOString()}] : []; })}));
export const reorderFavorites = (profile: string, ids: readonly string[]) => updateSettings(profile, (settings) => { const byId = new Map(listFrom(settings).map((favorite) => [favorite.id, favorite])); const favorites = ids.flatMap((favoriteId) => { const favorite = byId.get(favoriteId); if (favorite) byId.delete(favoriteId); return favorite ? [favorite] : []; }).concat([...byId.values()]); return {...settings, favorites}; });

const duplicateName = (favorites: readonly Poe2FavoriteRecord[], sourceName: string): string => {
  const names = new Set(favorites.map((favorite) => favorite.name.toLocaleLowerCase()));
  const base = `${sourceName} copy`.slice(0, 80);
  if (!names.has(base.toLocaleLowerCase())) return base;
  for (let index = 2; index < 1000; index++) {
    const suffix = ` (${index})`;
    const candidate = `${base.slice(0, 80 - suffix.length)}${suffix}`;
    if (!names.has(candidate.toLocaleLowerCase())) return candidate;
  }
  return `${sourceName.slice(0, 60)} ${createFavoriteId().slice(0, 8)}`;
};

export const duplicateFavorite = (profile: string, favoriteId: string) => updateSettings(profile, (settings) => {
  const favorites = listFrom(settings);
  const source = favorites.find((favorite) => favorite.id === favoriteId);
  if (!source) throw new Error("Favorite not found.");
  const now = new Date().toISOString();
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
  return {...settings, favorites: favorites.flatMap((favorite) => favorite.id === favoriteId ? [favorite, duplicate] : [favorite])};
});
