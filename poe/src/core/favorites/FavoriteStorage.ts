import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import {cloneFavoriteConfiguration, createFavoriteId, FavoriteGroupRecord, FavoriteMetadata, FavoriteRecord, FavoriteSnapshot, isFavoriteGroup, isGroupableFavorite, isRegexFavorite, isStaticFavorite, normalizeFavoriteTags, parseFavoriteRecords, RegexFavoriteRecord, sanitizeFavoriteColor, sanitizeFavoriteIcon, StaticFavoriteRecord} from "./FavoriteTypes";
import {FavoriteGroupOperator, selectValidFavoriteGroupMembers} from "@shared/core/favorites/FavoriteTypes";

export const listFavorites = (profileName: string): FavoriteRecord[] => parseFavoriteRecords(loadSettings(profileName).favorites);
export const getFavorite = (profileName: string, id: string): FavoriteRecord | undefined => listFavorites(profileName).find((favorite) => favorite.id === id);

export const createFavorite = (profileName: string, snapshot: FavoriteSnapshot, metadata: FavoriteMetadata): RegexFavoriteRecord => {
  const now = new Date().toISOString();
  const record: RegexFavoriteRecord = {
    schemaVersion: 1, kind: "favorite", id: createFavoriteId(), pageKey: snapshot.pageKey,
    name: metadata.name.trim().slice(0, 80), description: metadata.description.trim().slice(0, 1000),
    color: sanitizeFavoriteColor(metadata.color), icon: sanitizeFavoriteIcon(metadata.icon), tags: normalizeFavoriteTags(metadata.tags),
    regex: snapshot.regex, configuration: cloneFavoriteConfiguration(snapshot.configuration), context: {...snapshot.context}, languageDependent: snapshot.languageDependent,
    createdAt: now, updatedAt: now,
  };
  if (!record.name || !record.regex.trim()) throw new Error("A favorite needs a name and a non-empty regex");
  updateSettings(profileName, (settings) => ({...settings, favorites: [...parseFavoriteRecords(settings.favorites), record]}));
  return record;
};

export const createStaticFavorite = (profileName: string, regex: string, metadata: FavoriteMetadata): StaticFavoriteRecord => {
  const now = new Date().toISOString();
  const record: StaticFavoriteRecord = {
    schemaVersion: 1,
    kind: "static",
    id: createFavoriteId(),
    name: metadata.name.trim().slice(0, 80),
    description: metadata.description.trim().slice(0, 1000),
    color: sanitizeFavoriteColor(metadata.color),
    icon: sanitizeFavoriteIcon(metadata.icon),
    tags: normalizeFavoriteTags(metadata.tags),
    regex: regex.trim(),
    createdAt: now,
    updatedAt: now,
  };
  if (!record.name || !record.regex) throw new Error("A static favorite needs a name and a non-empty regex");
  updateSettings(profileName, (settings) => ({...settings, favorites: [...parseFavoriteRecords(settings.favorites), record]}));
  return record;
};

export const createFavoriteGroup = (profileName: string, ids: readonly string[], operator: FavoriteGroupOperator, metadata: FavoriteMetadata): FavoriteGroupRecord => {
  const candidates = listFavorites(profileName).filter(isGroupableFavorite);
  const members = selectValidFavoriteGroupMembers(candidates, ids, operator);
  const now = new Date().toISOString();
  const record: FavoriteGroupRecord = {schemaVersion: 1, kind: "group", id: createFavoriteId(), name: metadata.name.trim().slice(0, 80), description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), icon: sanitizeFavoriteIcon(metadata.icon), tags: normalizeFavoriteTags(metadata.tags), memberIds: members.map((member) => member.id), operator, createdAt: now, updatedAt: now};
  if (!record.name) throw new Error("A group needs a name.");
  updateSettings(profileName, (settings) => ({...settings, favorites: [...parseFavoriteRecords(settings.favorites), record]}));
  return record;
};

export const setFavoriteHidden = (profileName: string, id: string, hidden: boolean) => updateSettings(profileName, (settings) => ({...settings, favorites: parseFavoriteRecords(settings.favorites).map((favorite) => favorite.id === id ? {...favorite, hidden: hidden || undefined} : favorite)}));
export const updateFavoriteGroup = (profileName: string, id: string, ids: readonly string[], operator: FavoriteGroupOperator, metadata: FavoriteMetadata) => updateSettings(profileName, (settings) => {
  const name = metadata.name.trim().slice(0, 80);
  if (!name) throw new Error("A group needs a name.");
  const favorites = parseFavoriteRecords(settings.favorites);
  const target = favorites.find((favorite) => favorite.id === id);
  if (!target || !isFavoriteGroup(target)) throw new Error("Favorite group not found.");
  const members = selectValidFavoriteGroupMembers(favorites.filter(isGroupableFavorite), ids, operator);
  return {...settings, favorites: favorites.map((favorite) => favorite.id === id ? {...favorite, memberIds: members.map((member) => member.id), operator, name, description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), icon: sanitizeFavoriteIcon(metadata.icon), tags: normalizeFavoriteTags(metadata.tags), updatedAt: new Date().toISOString()} : favorite)};
});

export const updateFavoriteMetadata = (profileName: string, id: string, metadata: FavoriteMetadata): FavoriteRecord => {
  const name = metadata.name.trim().slice(0, 80);
  if (!name) throw new Error("Favorite name is required");
  let updated: FavoriteRecord | undefined;
  updateSettings(profileName, (settings) => ({...settings, favorites: parseFavoriteRecords(settings.favorites).map((favorite) => {
    if (favorite.id !== id) return favorite;
    updated = {...favorite, name, description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), icon: sanitizeFavoriteIcon(metadata.icon), tags: normalizeFavoriteTags(metadata.tags), updatedAt: new Date().toISOString()};
    return updated;
  })}));
  if (!updated) throw new Error("Favorite not found");
  return updated;
};

export const updateFavoriteSnapshot = (profileName: string, id: string, snapshot: FavoriteSnapshot): FavoriteRecord => {
  let updated: FavoriteRecord | undefined;
  updateSettings(profileName, (settings) => ({...settings, favorites: parseFavoriteRecords(settings.favorites).map((favorite) => {
    if (favorite.id !== id || !isRegexFavorite(favorite) || favorite.pageKey !== snapshot.pageKey) return favorite;
    updated = {...favorite, regex: snapshot.regex, configuration: cloneFavoriteConfiguration(snapshot.configuration), context: {...snapshot.context}, languageDependent: snapshot.languageDependent, updatedAt: new Date().toISOString()};
    return updated;
  })}));
  if (!updated) throw new Error("Favorite not found for this page");
  return updated;
};

export const updateStaticFavorite = (profileName: string, id: string, regex: string, metadata: FavoriteMetadata): void => {
  const name = metadata.name.trim().slice(0, 80);
  const normalizedRegex = regex.trim();
  if (!name || !normalizedRegex) throw new Error("A static favorite needs a name and a non-empty regex");
  updateSettings(profileName, (settings) => {
    const favorites = parseFavoriteRecords(settings.favorites);
    const target = favorites.find((favorite) => favorite.id === id);
    if (!target || !isStaticFavorite(target)) throw new Error("Static favorite not found.");
    return {...settings, favorites: favorites.map((favorite) => {
      if (favorite.id !== id) return favorite;
      return {...favorite, regex: normalizedRegex, name, description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), icon: sanitizeFavoriteIcon(metadata.icon), tags: normalizeFavoriteTags(metadata.tags), updatedAt: new Date().toISOString()};
    })};
  });
};

const duplicateName = (favorites: readonly FavoriteRecord[], sourceName: string): string => {
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

export const duplicateFavorite = (profileName: string, id: string): FavoriteRecord => {
  let duplicate: FavoriteRecord | undefined;
  updateSettings(profileName, (settings) => {
    const favorites = parseFavoriteRecords(settings.favorites);
    const source = favorites.find((favorite) => favorite.id === id);
    if (!source) throw new Error("Favorite not found.");
    const now = new Date().toISOString();
    duplicate = {
      ...source,
      id: createFavoriteId(),
      name: duplicateName(favorites, source.name),
      hidden: undefined,
      createdAt: now,
      updatedAt: now,
      ...(isRegexFavorite(source) ? {configuration: cloneFavoriteConfiguration(source.configuration), context: {...source.context}} : {}),
      ...(isFavoriteGroup(source) ? {memberIds: [...source.memberIds]} : {}),
    } as FavoriteRecord;
    return {...settings, favorites: favorites.flatMap((favorite) => favorite.id === id ? [favorite, duplicate!] : [favorite])};
  });
  if (!duplicate) throw new Error("Favorite could not be duplicated.");
  return duplicate;
};

export const removeFavorite = (profileName: string, id: string): void => {
  updateSettings(profileName, (settings) => {
    const remaining = parseFavoriteRecords(settings.favorites).filter((favorite) => favorite.id !== id).flatMap<FavoriteRecord>((favorite) => {
      if (!isFavoriteGroup(favorite)) return [favorite];
      const memberIds = favorite.memberIds.filter((memberId) => memberId !== id);
      return memberIds.length >= 2 ? [{...favorite, memberIds, updatedAt: new Date().toISOString()}] : [];
    });
    return {...settings, favorites: remaining};
  });
};

export const reorderFavorites = (profileName: string, orderedIds: readonly string[]): FavoriteRecord[] => {
  let reordered: FavoriteRecord[] = [];
  updateSettings(profileName, (settings) => {
    const byId = new Map(parseFavoriteRecords(settings.favorites).map((favorite) => [favorite.id, favorite]));
    reordered = orderedIds.flatMap((id) => { const favorite = byId.get(id); if (!favorite) return []; byId.delete(id); return [favorite]; }).concat([...byId.values()]);
    return {...settings, favorites: reordered};
  });
  return reordered;
};
