import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {FavoriteDialog} from "@shared/components/favorites/FavoriteDialog";
import {createFavorite, createFavoriteGroup, createStaticFavorite, duplicateFavorite, listFavorites, removeFavorite, reorderFavorites, setFavoriteHidden, updateFavoriteGroup, updateFavoriteMetadata, updateFavoriteSnapshot, updateStaticFavorite} from "./FavoriteStorage";
import {FavoriteGroupOperator} from "@shared/core/favorites/FavoriteTypes";
import {FavoriteMetadata, FavoriteRecord, FavoriteSnapshot, Poe1FavoritePageKey} from "./FavoriteTypes";
import {FAVORITE_PAGE_REGISTRY} from "./FavoritePageRegistry";

interface PendingFavorite { snapshot: FavoriteSnapshot; suggestedName: string }
interface CreationSuccess { pageKey: Poe1FavoritePageKey; configuration: string }

const STORAGE_ERROR_MESSAGE = "Your browser's local storage is full or unavailable.";
const isStorageError = (error: unknown): boolean => typeof DOMException !== "undefined"
  && error instanceof DOMException
  && (error.name === "QuotaExceededError" || error.name === "SecurityError");

interface FavoritesValue {
  favorites: FavoriteRecord[];
  storageError?: string;
  lastCreationSuccess?: CreationSuccess;
  clearCreationSuccess: () => void;
  requestCreate: (snapshot: FavoriteSnapshot, suggestedName?: string) => void;
  updateMetadata: (id: string, metadata: FavoriteMetadata) => void;
  updateSnapshot: (id: string, snapshot: FavoriteSnapshot, ownerProfile?: string) => void;
  remove: (id: string) => void;
  reorder: (orderedIds: readonly string[]) => void;
  createGroup: (ids: readonly string[], operator: FavoriteGroupOperator, metadata: FavoriteMetadata) => void;
  createStatic: (regex: string, metadata: FavoriteMetadata) => void;
  updateStatic: (id: string, regex: string, metadata: FavoriteMetadata) => void;
  duplicate: (id: string) => void;
  setHidden: (id: string, hidden: boolean) => void;
  updateGroup: (id: string, ids: readonly string[], operator: FavoriteGroupOperator, metadata: FavoriteMetadata) => void;
  reload: () => void;
}

const FavoritesContext = createContext<FavoritesValue | undefined>(undefined);

export const FavoritesProvider = ({children}: {children: ReactNode}) => {
  const {globalProfile} = useContext(ProfileContext);
  const [favorites, setFavorites] = useState<FavoriteRecord[]>(() => listFavorites(globalProfile));
  const [pending, setPending] = useState<PendingFavorite | undefined>();
  const [storageError, setStorageError] = useState<string | undefined>();
  const [lastCreationSuccess, setLastCreationSuccess] = useState<CreationSuccess | undefined>();

  const reload = useCallback(() => {
    setFavorites(listFavorites(globalProfile));
    setStorageError(undefined);
  }, [globalProfile]);
  const mutationError = useCallback((error: unknown, fallback: string): Error => {
    if (isStorageError(error)) {
      setStorageError(STORAGE_ERROR_MESSAGE);
      return new Error(STORAGE_ERROR_MESSAGE);
    }
    return error instanceof Error ? error : new Error(fallback);
  }, []);
  useEffect(() => { reload(); setPending(undefined); }, [reload]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => { if (event.key === "profiles") reload(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reload]);

  const value = useMemo<FavoritesValue>(() => ({
    favorites,
    storageError,
    lastCreationSuccess,
    clearCreationSuccess: () => setLastCreationSuccess(undefined),
    requestCreate: (snapshot, suggestedName = FAVORITE_PAGE_REGISTRY[snapshot.pageKey].label) => {
      setStorageError(undefined);
      setPending({snapshot, suggestedName});
    },
    updateMetadata: (id, metadata) => {
      try { updateFavoriteMetadata(globalProfile, id, metadata); reload(); }
      catch (error) { throw mutationError(error, "Could not update the favorite."); }
    },
    updateSnapshot: (id, snapshot, ownerProfile = globalProfile) => {
      if (ownerProfile !== globalProfile) throw new Error("The active profile changed. Reopen the favorite before updating it.");
      try { updateFavoriteSnapshot(ownerProfile, id, snapshot); reload(); }
      catch (error) { throw mutationError(error, "Could not update the favorite regex."); }
    },
    remove: (id) => {
      try { removeFavorite(globalProfile, id); reload(); }
      catch (error) { setStorageError(mutationError(error, "Could not delete the favorite.").message); }
    },
    reorder: (orderedIds) => {
      try { setFavorites(reorderFavorites(globalProfile, orderedIds)); setStorageError(undefined); }
      catch (error) { setStorageError(mutationError(error, "Could not reorder favorites.").message); }
    },
    createGroup: (ids, operator, metadata) => {
      try { createFavoriteGroup(globalProfile, ids, operator, metadata); reload(); }
      catch (error) { throw mutationError(error, "Could not save the favorite group."); }
    },
    createStatic: (regex, metadata) => {
      try { createStaticFavorite(globalProfile, regex, metadata); reload(); }
      catch (error) { throw mutationError(error, "Could not save the static favorite."); }
    },
    updateStatic: (id, regex, metadata) => {
      try { updateStaticFavorite(globalProfile, id, regex, metadata); reload(); }
      catch (error) { throw mutationError(error, "Could not update the static favorite."); }
    },
    duplicate: (id) => {
      try { duplicateFavorite(globalProfile, id); reload(); }
      catch (error) { setStorageError(mutationError(error, "Could not duplicate the favorite.").message); }
    },
    setHidden: (id, hidden) => {
      try { setFavoriteHidden(globalProfile, id, hidden); reload(); }
      catch (error) { setStorageError(mutationError(error, "Could not update favorite visibility.").message); }
    },
    updateGroup: (id, ids, operator, metadata) => {
      try { updateFavoriteGroup(globalProfile, id, ids, operator, metadata); reload(); }
      catch (error) { throw mutationError(error, "Could not update the favorite group."); }
    },
    reload,
  }), [favorites, globalProfile, lastCreationSuccess, mutationError, reload, storageError]);

  return <FavoritesContext.Provider value={value}>
    {children}
    {pending && <FavoriteDialog
      title="Save favorite"
      initial={{name: pending.suggestedName}}
      duplicateNames={favorites.map((favorite) => favorite.name)}
      onCancel={() => setPending(undefined)}
      onSave={(metadata) => {
        try {
          createFavorite(globalProfile, pending.snapshot, metadata);
          setPending(undefined);
          reload();
          setLastCreationSuccess({pageKey: pending.snapshot.pageKey, configuration: JSON.stringify(pending.snapshot.configuration)});
        } catch (error) { throw mutationError(error, "Could not save the favorite."); }
      }}
    />}
  </FavoritesContext.Provider>;
};

export const useFavorites = (): FavoritesValue => {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites must be used inside FavoritesProvider");
  return value;
};
