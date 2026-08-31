import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {FavoriteDialog} from "@shared/components/favorites/FavoriteDialog";
import {FavoriteMetadata} from "@shared/core/favorites/FavoriteTypes";
import {Poe2ProfileContext} from "./layout/Poe2ProfileContext";
import {createFavorite, FavoriteSnapshot, listFavorites, removeFavorite, reorderFavorites, updateFavorite, updateFavoriteMetadata} from "./favorites";
import {Poe2FavoritePageKey, Poe2FavoriteRecord} from "./settings";

interface CreationSuccess { pageKey: Poe2FavoritePageKey; configuration: string }
type Value = {favorites: Poe2FavoriteRecord[]; lastCreationSuccess?: CreationSuccess; clearCreationSuccess: () => void; requestCreate: (snapshot: FavoriteSnapshot, name: string) => void; update: (id: string, snapshot: FavoriteSnapshot) => void; customize: (id: string, metadata: FavoriteMetadata) => void; remove: (id: string) => void; reorder: (ids: string[]) => void;};
const Context = createContext<Value | undefined>(undefined);
export const FavoritesProvider = ({children}: {children: ReactNode}) => {
  const {currentProfile} = useContext(Poe2ProfileContext);
  const [favorites, setFavorites] = useState(() => listFavorites(currentProfile));
  const [pending, setPending] = useState<{snapshot: FavoriteSnapshot; name: string}>();
  const [lastCreationSuccess, setLastCreationSuccess] = useState<CreationSuccess>();
  const reload = useCallback(() => setFavorites(listFavorites(currentProfile)), [currentProfile]);
  useEffect(() => { reload(); setPending(undefined); }, [reload]);
  const value = useMemo<Value>(() => ({favorites, lastCreationSuccess, clearCreationSuccess: () => setLastCreationSuccess(undefined), requestCreate: (snapshot, name) => setPending({snapshot, name}), update: (id, snapshot) => { updateFavorite(currentProfile, id, snapshot); reload(); }, customize: (id, metadata) => { updateFavoriteMetadata(currentProfile, id, metadata); reload(); }, remove: (id) => { removeFavorite(currentProfile, id); reload(); }, reorder: (ids) => { reorderFavorites(currentProfile, ids); reload(); }}), [currentProfile, favorites, lastCreationSuccess, reload]);
  return <Context.Provider value={value}>{children}{pending && <FavoriteDialog title="Save favorite" initial={{name: pending.name}} duplicateNames={favorites.map((favorite) => favorite.name)} onCancel={() => setPending(undefined)} onSave={(metadata) => { createFavorite(currentProfile, pending.snapshot, metadata); setPending(undefined); reload(); setLastCreationSuccess({pageKey: pending.snapshot.pageKey, configuration: JSON.stringify(pending.snapshot.configuration)}); }}/>}</Context.Provider>;
};
export const useFavorites = () => { const value = useContext(Context); if (!value) throw new Error("FavoritesProvider is missing"); return value; };
