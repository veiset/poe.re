import {useContext, useEffect, useMemo} from "react";
import {useLocation, useNavigate, useSearchParams} from "react-router-dom";
import {merge} from "@shared/core/utils";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {useFavorites} from "./FavoritesContext";
import {FavoriteContextData, FavoriteSnapshot, Poe1FavoritePageKey, cloneFavoriteConfiguration} from "./FavoriteTypes";
import {FAVORITE_PAGE_REGISTRY} from "./FavoritePageRegistry";
import type {RegexFavoriteAction} from "@shared/components/RegexResultBox/RegexResultBox";

export interface FavoritePageSession<T> {
  initialConfiguration: T;
  isEditingFavorite: boolean;
  action: (configuration: T, context?: FavoriteContextData, disabledReason?: string) => RegexFavoriteAction;
}

export const useFavoritePage = <T extends object>(pageKey: Poe1FavoritePageKey, normalConfiguration: T): FavoritePageSession<T> => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {globalProfile} = useContext(ProfileContext);
  const {favorites, requestCreate, updateSnapshot} = useFavorites();
  const requestedId = searchParams.get("favorite");
  const requestedFavorite = requestedId ? favorites.find((candidate) => candidate.id === requestedId) : undefined;
  const favorite = requestedFavorite?.pageKey === pageKey ? requestedFavorite : undefined;
  const isEditingFavorite = requestedId !== null;
  useEffect(() => {
    if (!requestedId) return;
    const nextParams = new URLSearchParams(searchParams);
    if (!requestedFavorite) {
      nextParams.delete("favorite");
      const search = nextParams.toString();
      navigate({pathname: location.pathname, search: search ? `?${search}` : ""}, {replace: true});
      return;
    }
    if (requestedFavorite.pageKey !== pageKey) {
      navigate({
        pathname: FAVORITE_PAGE_REGISTRY[requestedFavorite.pageKey].route,
        search: `?${nextParams.toString()}`,
      }, {replace: true});
    }
  }, [location.pathname, navigate, pageKey, requestedFavorite, requestedId, searchParams]);
  useEffect(() => {
    if (!isEditingFavorite) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isEditingFavorite]);
  const initialConfiguration = useMemo(() => {
    if (!favorite || !favorite.configuration || typeof favorite.configuration !== "object" || Array.isArray(favorite.configuration)) {
      return cloneFavoriteConfiguration(normalConfiguration);
    }
    return merge(cloneFavoriteConfiguration(normalConfiguration), cloneFavoriteConfiguration(favorite.configuration) as Partial<T>);
    // This value deliberately remains stable for the lifetime of the mounted editor.
  }, [favorite?.id]);

  return {
    initialConfiguration,
    isEditingFavorite,
    action: (configuration, context = {}, disabledReason) => ({
      mode: isEditingFavorite ? "edit" : "create",
      favoriteName: favorite?.name,
      savedResult: favorite?.regex,
      disabledReason: disabledReason ?? (requestedId && !favorite ? "This favorite does not exist in the active profile or belongs to another page." : undefined),
      onSave: async (finalResult) => {
        const snapshot: FavoriteSnapshot = {pageKey, regex: finalResult, configuration, context};
        if (favorite) {
          updateSnapshot(favorite.id, snapshot, globalProfile);
          navigate("/favorites");
        } else if (!requestedId) {
          requestCreate(snapshot);
        }
      },
      onCancel: isEditingFavorite ? () => navigate(`/favorites${favorite ? `?focus=${encodeURIComponent(favorite.id)}` : ""}`) : undefined,
    }),
  };
};
