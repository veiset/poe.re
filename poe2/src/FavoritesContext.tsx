import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {FavoriteDialog} from "@shared/components/favorites/FavoriteDialog";
import {FavoriteMetadata} from "@shared/core/favorites/FavoriteTypes";
import {Poe2ProfileContext} from "./layout/Poe2ProfileContext";
import {createFavorite, createFavoriteGroup, createStaticFavorite, duplicateFavorite, FavoriteSnapshot, listFavorites, removeFavorite, reorderFavorites, setFavoriteHidden, updateFavorite, updateFavoriteGroup, updateFavoriteMetadata, updateStaticFavorite} from "./favorites";
import {FavoriteGroupOperator} from "@shared/core/favorites/FavoriteTypes";
import {Poe2FavoritePageKey, Poe2FavoriteRecord} from "./settings";
import {PROFILE_SETTINGS_CHANGED_EVENT} from "./localStorage";

interface CreationSuccess {
  pageKey: Poe2FavoritePageKey;
  configuration: string;
}

interface FavoritesValue {
  favorites: Poe2FavoriteRecord[];
  lastCreationSuccess?: CreationSuccess;
  clearCreationSuccess: () => void;
  requestCreate: (snapshot: FavoriteSnapshot, name: string) => void;
  update: (id: string, snapshot: FavoriteSnapshot) => void;
  customize: (id: string, metadata: FavoriteMetadata) => void;
  remove: (id: string) => void;
  reorder: (ids: string[]) => void;
  createGroup: (ids: string[], operator: FavoriteGroupOperator, metadata: FavoriteMetadata) => void;
  createStatic: (regex: string, metadata: FavoriteMetadata) => void;
  updateStatic: (id: string, regex: string, metadata: FavoriteMetadata) => void;
  duplicate: (id: string) => void;
  setHidden: (id: string, hidden: boolean) => void;
  updateGroup: (id: string, ids: string[], operator: FavoriteGroupOperator, metadata: FavoriteMetadata) => void;
}

const Context = createContext<FavoritesValue | undefined>(undefined);
export const FavoritesProvider = ({children}: {children: ReactNode}) => {
  const {currentProfile} = useContext(Poe2ProfileContext);
  const [favorites, setFavorites] = useState(() => listFavorites(currentProfile));
  const [pending, setPending] = useState<{snapshot: FavoriteSnapshot; name: string}>();
  const [lastCreationSuccess, setLastCreationSuccess] = useState<CreationSuccess>();
  const reload = useCallback(() => setFavorites(listFavorites(currentProfile)), [currentProfile]);
  useEffect(() => { reload(); setPending(undefined); }, [reload]);
  useEffect(() => {
    const onProfileSettingsChanged = (event: Event) => {
      if ((event as CustomEvent<string>).detail === currentProfile) reload();
    };
    window.addEventListener(PROFILE_SETTINGS_CHANGED_EVENT, onProfileSettingsChanged);
    return () => window.removeEventListener(PROFILE_SETTINGS_CHANGED_EVENT, onProfileSettingsChanged);
  }, [currentProfile, reload]);
  const value = useMemo<FavoritesValue>(() => ({
    favorites,
    lastCreationSuccess,
    clearCreationSuccess: () => setLastCreationSuccess(undefined),
    requestCreate: (snapshot, name) => setPending({snapshot, name}),
    update: (id, snapshot) => { updateFavorite(currentProfile, id, snapshot); reload(); },
    customize: (id, metadata) => { updateFavoriteMetadata(currentProfile, id, metadata); reload(); },
    remove: (id) => { removeFavorite(currentProfile, id); reload(); },
    reorder: (ids) => { reorderFavorites(currentProfile, ids); reload(); },
    createGroup: (ids, operator, metadata) => { createFavoriteGroup(currentProfile, ids, operator, metadata); reload(); },
    createStatic: (regex, metadata) => { createStaticFavorite(currentProfile, regex, metadata); reload(); },
    updateStatic: (id, regex, metadata) => { updateStaticFavorite(currentProfile, id, regex, metadata); reload(); },
    duplicate: (id) => { duplicateFavorite(currentProfile, id); reload(); },
    setHidden: (id, hidden) => { setFavoriteHidden(currentProfile, id, hidden); reload(); },
    updateGroup: (id, ids, operator, metadata) => { updateFavoriteGroup(currentProfile, id, ids, operator, metadata); reload(); },
  }), [currentProfile, favorites, lastCreationSuccess, reload]);

  return <Context.Provider value={value}>
    {children}
    {pending && <FavoriteDialog
      title="Save favorite"
      initial={{name: pending.name}}
      duplicateNames={favorites.map((favorite) => favorite.name)}
      onCancel={() => setPending(undefined)}
      onSave={(metadata) => {
        createFavorite(currentProfile, pending.snapshot, metadata);
        setPending(undefined);
        reload();
        setLastCreationSuccess({pageKey: pending.snapshot.pageKey, configuration: JSON.stringify(pending.snapshot.configuration)});
      }}
    />}
  </Context.Provider>;
};

export const useFavorites = () => {
  const value = useContext(Context);
  if (!value) throw new Error("FavoritesProvider is missing");
  return value;
};
