import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {FavoriteDialog} from "@shared/components/favorites/FavoriteDialog";
import {createFavorite, listFavorites, removeFavorite, reorderFavorites, updateFavoriteMetadata, updateFavoriteSnapshot} from "./FavoriteStorage";
import {FavoriteMetadata, FavoriteRecord, FavoriteSnapshot} from "./FavoriteTypes";
import {FAVORITE_PAGE_REGISTRY} from "./FavoritePageRegistry";

interface PendingFavorite { snapshot: FavoriteSnapshot; suggestedName: string }

interface FavoritesValue {
  favorites: FavoriteRecord[];
  storageError?: string;
  requestCreate: (snapshot: FavoriteSnapshot, suggestedName?: string) => void;
  updateMetadata: (id: string, metadata: FavoriteMetadata) => void;
  updateSnapshot: (id: string, snapshot: FavoriteSnapshot, ownerProfile?: string) => void;
  remove: (id: string) => void;
  reorder: (orderedIds: readonly string[]) => void;
  reload: () => void;
}

const FavoritesContext = createContext<FavoritesValue | undefined>(undefined);

export const FavoritesProvider = ({children}: {children: ReactNode}) => {
  const {globalProfile} = useContext(ProfileContext);
  const [favorites, setFavorites] = useState<FavoriteRecord[]>(() => listFavorites(globalProfile));
  const [pending, setPending] = useState<PendingFavorite | undefined>();
  const [storageError, setStorageError] = useState<string | undefined>();

  const reload = useCallback(() => setFavorites(listFavorites(globalProfile)), [globalProfile]);
  useEffect(() => { reload(); setPending(undefined); }, [reload]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => { if (event.key === "profiles") reload(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reload]);

  const value = useMemo<FavoritesValue>(() => ({
    favorites,
    storageError,
    requestCreate: (snapshot, suggestedName = FAVORITE_PAGE_REGISTRY[snapshot.pageKey].label) => {
      setStorageError(undefined);
      setPending({snapshot, suggestedName});
    },
    updateMetadata: (id, metadata) => {
      try { updateFavoriteMetadata(globalProfile, id, metadata); reload(); }
      catch {
        const message = "Your browser's local storage is full or unavailable.";
        setStorageError(message);
        throw new Error(message);
      }
    },
    updateSnapshot: (id, snapshot, ownerProfile = globalProfile) => {
      if (ownerProfile !== globalProfile) throw new Error("The active profile changed. Reopen the favorite before updating it.");
      try { updateFavoriteSnapshot(ownerProfile, id, snapshot); reload(); }
      catch {
        const message = "Your browser's local storage is full or unavailable.";
        setStorageError(message);
        throw new Error(message);
      }
    },
    remove: (id) => {
      try { removeFavorite(globalProfile, id); reload(); }
      catch { setStorageError("Your browser's local storage is full or unavailable."); }
    },
    reorder: (orderedIds) => {
      try { setFavorites(reorderFavorites(globalProfile, orderedIds)); }
      catch { setStorageError("Your browser's local storage is full or unavailable."); }
    },
    reload,
  }), [favorites, globalProfile, reload, storageError]);

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
        } catch (error) {
          setStorageError("Your browser's local storage is full or unavailable.");
          throw new Error("Your browser's local storage is full or unavailable.");
        }
      }}
    />}
  </FavoritesContext.Provider>;
};

export const useFavorites = (): FavoritesValue => {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites must be used inside FavoritesProvider");
  return value;
};
