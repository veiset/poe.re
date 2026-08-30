import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import {cloneFavoriteConfiguration, createFavoriteId, FavoriteMetadata, FavoriteRecord, FavoriteSnapshot, normalizeFavoriteTags, parseFavoriteRecords, sanitizeFavoriteColor, sanitizeFavoriteIcon} from "./FavoriteTypes";

export const listFavorites = (profileName: string): FavoriteRecord[] => parseFavoriteRecords(loadSettings(profileName).favorites);
export const getFavorite = (profileName: string, id: string): FavoriteRecord | undefined => listFavorites(profileName).find((favorite) => favorite.id === id);

export const createFavorite = (profileName: string, snapshot: FavoriteSnapshot, metadata: FavoriteMetadata): FavoriteRecord => {
  const now = new Date().toISOString();
  const record: FavoriteRecord = {
    schemaVersion: 1, id: createFavoriteId(), pageKey: snapshot.pageKey,
    name: metadata.name.trim().slice(0, 80), description: metadata.description.trim().slice(0, 1000),
    color: sanitizeFavoriteColor(metadata.color), icon: sanitizeFavoriteIcon(metadata.icon), tags: normalizeFavoriteTags(metadata.tags),
    regex: snapshot.regex, configuration: cloneFavoriteConfiguration(snapshot.configuration), context: {...snapshot.context},
    createdAt: now, updatedAt: now,
  };
  if (!record.name || !record.regex.trim()) throw new Error("A favorite needs a name and a non-empty regex");
  updateSettings(profileName, (settings) => ({...settings, favorites: [...parseFavoriteRecords(settings.favorites), record]}));
  return record;
};

export const updateFavoriteMetadata = (profileName: string, id: string, metadata: FavoriteMetadata): FavoriteRecord => {
  let updated: FavoriteRecord | undefined;
  updateSettings(profileName, (settings) => ({...settings, favorites: parseFavoriteRecords(settings.favorites).map((favorite) => {
    if (favorite.id !== id) return favorite;
    updated = {...favorite, name: metadata.name.trim().slice(0, 80), description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), icon: sanitizeFavoriteIcon(metadata.icon), tags: normalizeFavoriteTags(metadata.tags), updatedAt: new Date().toISOString()};
    return updated;
  })}));
  if (!updated) throw new Error("Favorite not found");
  if (!updated.name) throw new Error("Favorite name is required");
  return updated;
};

export const updateFavoriteSnapshot = (profileName: string, id: string, snapshot: FavoriteSnapshot): FavoriteRecord => {
  let updated: FavoriteRecord | undefined;
  updateSettings(profileName, (settings) => ({...settings, favorites: parseFavoriteRecords(settings.favorites).map((favorite) => {
    if (favorite.id !== id || favorite.pageKey !== snapshot.pageKey) return favorite;
    updated = {...favorite, regex: snapshot.regex, configuration: cloneFavoriteConfiguration(snapshot.configuration), context: {...snapshot.context}, updatedAt: new Date().toISOString()};
    return updated;
  })}));
  if (!updated) throw new Error("Favorite not found for this page");
  return updated;
};

export const removeFavorite = (profileName: string, id: string): void => {
  updateSettings(profileName, (settings) => ({...settings, favorites: parseFavoriteRecords(settings.favorites).filter((favorite) => favorite.id !== id)}));
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
