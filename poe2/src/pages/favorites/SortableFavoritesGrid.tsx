import {SortableFavoritesGrid as SharedGrid, SortableFavoritesGridProps, SortableFavoriteView} from "@shared/components/favorites/SortableFavoritesGrid";
import {ResolvedFavoriteGroup} from "@shared/core/favorites/FavoriteTypes";
import {Poe2FavoriteGroupRecord, Poe2FavoriteRecord, Poe2RegexFavoriteRecord, Poe2StaticFavoriteRecord} from "../../settings";
import {FAVORITE_PAGE_REGISTRY} from "../../FavoritePageRegistry";

type FavoriteView = ResolvedFavoriteGroup<Poe2FavoriteRecord> & SortableFavoriteView;
type SharedProps = Omit<SortableFavoritesGridProps<FavoriteView>, "getSourceIcon" | "onEditRegex" | "onEditGroup" | "onEditStatic">;

export default function SortableFavoritesGrid(props: SharedProps & {onEdit: (favorite: Poe2RegexFavoriteRecord) => void; onEditGroup: (favorite: Poe2FavoriteGroupRecord) => void; onEditStatic: (favorite: Poe2StaticFavoriteRecord) => void}) {
  const {onEdit, onEditGroup, onEditStatic, ...gridProps} = props;
  return <SharedGrid
    {...gridProps}
    getSourceIcon={(favorite) => favorite.kind === "favorite" ? FAVORITE_PAGE_REGISTRY[favorite.pageKey].icon : undefined}
    onEditRegex={(favorite) => { if (favorite.kind === "favorite") onEdit(favorite); }}
    onEditGroup={(favorite) => { if (favorite.kind === "group") onEditGroup(favorite); }}
    onEditStatic={(favorite) => { if (favorite.kind === "static") onEditStatic(favorite); }}
  />;
}
