import {cloneFavoriteConfiguration, createFavoriteId, FavoriteMetadata, normalizeFavoriteTags, sanitizeFavoriteColor} from "@shared/core/favorites/FavoriteTypes";
import {loadSettings, updateSettings} from "./localStorage";
import {Poe2FavoritePageKey, Poe2FavoriteRecord, Settings} from "./settings";

export interface FavoriteSnapshot { pageKey: Poe2FavoritePageKey; regex: string; configuration: unknown; context: {league?: string} }
const keys: readonly Poe2FavoritePageKey[] = ["vendor", "waystone", "tablet", "relic", "item"];

export const parseFavorites = (raw: unknown): Poe2FavoriteRecord[] => {
  return Array.isArray(raw) ? raw.filter((item): item is Poe2FavoriteRecord => Boolean(item && typeof item === "object" && item.schemaVersion === 1 && keys.includes(item.pageKey) && typeof item.id === "string" && typeof item.name === "string" && typeof item.regex === "string")) : [];
};
export const listFavorites = (profile: string): Poe2FavoriteRecord[] => parseFavorites(loadSettings(profile).favorites);
export const createFavorite = (profile: string, snapshot: FavoriteSnapshot, metadata: FavoriteMetadata) => {
  if (!snapshot.regex.trim() || !metadata.name.trim()) throw new Error("A favorite needs a name and a non-empty regex");
  const now = new Date().toISOString();
  const record: Poe2FavoriteRecord = {schemaVersion: 1, id: createFavoriteId(), pageKey: snapshot.pageKey, name: metadata.name.trim().slice(0, 80), description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), tags: normalizeFavoriteTags(metadata.tags), regex: snapshot.regex, configuration: cloneFavoriteConfiguration(snapshot.configuration), context: {...snapshot.context}, createdAt: now, updatedAt: now};
  updateSettings(profile, (settings) => ({...settings, favorites: [...listFrom(settings), record]}));
};
const listFrom = (settings: Settings) => parseFavorites(settings.favorites);
export const updateFavorite = (profile: string, favoriteId: string, snapshot: FavoriteSnapshot) => updateSettings(profile, (settings) => ({...settings, favorites: listFrom(settings).map((favorite) => favorite.id === favoriteId && favorite.pageKey === snapshot.pageKey ? {...favorite, regex: snapshot.regex, configuration: cloneFavoriteConfiguration(snapshot.configuration), context: {...snapshot.context}, updatedAt: new Date().toISOString()} : favorite)}));
export const updateFavoriteMetadata = (profile: string, favoriteId: string, metadata: FavoriteMetadata) => updateSettings(profile, (settings) => ({...settings, favorites: listFrom(settings).map((favorite) => favorite.id === favoriteId ? {...favorite, name: metadata.name.trim().slice(0, 80), description: metadata.description.trim().slice(0, 1000), color: sanitizeFavoriteColor(metadata.color), tags: normalizeFavoriteTags(metadata.tags), updatedAt: new Date().toISOString()} : favorite)}));
export const removeFavorite = (profile: string, favoriteId: string) => updateSettings(profile, (settings) => ({...settings, favorites: listFrom(settings).filter((favorite) => favorite.id !== favoriteId)}));
export const reorderFavorites = (profile: string, ids: readonly string[]) => updateSettings(profile, (settings) => { const byId = new Map(listFrom(settings).map((favorite) => [favorite.id, favorite])); const favorites = ids.flatMap((favoriteId) => { const favorite = byId.get(favoriteId); if (favorite) byId.delete(favoriteId); return favorite ? [favorite] : []; }).concat([...byId.values()]); return {...settings, favorites}; });
