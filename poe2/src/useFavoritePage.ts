import {useContext, useEffect, useMemo} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import {RegexFavoriteAction} from "@shared/components/RegexResultBox/RegexResultBox";
import {Poe2ProfileContext} from "./layout/Poe2ProfileContext";
import {useFavorites} from "./FavoritesContext";
import {FavoriteSnapshot} from "./favorites";
import {Poe2FavoritePageKey} from "./settings";
import {FAVORITE_PAGE_REGISTRY} from "./FavoritePageRegistry";

export const useFavoritePage = <T extends object>(pageKey: Poe2FavoritePageKey, normal: T) => {
  const [params] = useSearchParams(); const navigate = useNavigate(); const {currentProfile} = useContext(Poe2ProfileContext); const {favorites, requestCreate, update, lastCreationSuccess, clearCreationSuccess} = useFavorites();
  const requestedId = params.get("favorite"); const favorite = requestedId ? favorites.find((entry) => entry.id === requestedId && entry.pageKey === pageKey) : undefined;
  const initialConfiguration = useMemo(() => favorite?.configuration && typeof favorite.configuration === "object" && !Array.isArray(favorite.configuration) ? {...normal, ...((typeof structuredClone === "function" ? structuredClone(favorite.configuration) : JSON.parse(JSON.stringify(favorite.configuration))) as Partial<T>)} : normal, [favorite?.id]);
  useEffect(() => () => clearCreationSuccess(), [pageKey]);
  useEffect(() => { if (requestedId) clearCreationSuccess(); }, [requestedId]);
  const action = (configuration: T, context: {league?: string} = {}): RegexFavoriteAction => ({mode: requestedId ? "edit" : "create", favoriteName: favorite?.name, savedResult: favorite?.regex, successMessage: !requestedId && lastCreationSuccess?.pageKey === pageKey && lastCreationSuccess.configuration === JSON.stringify(configuration) ? "Successfully added as a favorite." : undefined, disabledReason: requestedId && !favorite ? "This favorite is unavailable in the active profile." : undefined, onSave: (regex) => { const snapshot: FavoriteSnapshot = {pageKey, regex, configuration, context}; if (favorite) { update(favorite.id, snapshot); navigate("/favorites"); } else if (!requestedId) requestCreate(snapshot, FAVORITE_PAGE_REGISTRY[pageKey].label); }, onCancel: requestedId ? () => navigate("/favorites") : undefined});
  return {initialConfiguration, isEditingFavorite: Boolean(requestedId), action};
};
