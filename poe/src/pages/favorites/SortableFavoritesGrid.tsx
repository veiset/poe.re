import {SortableFavoritesGrid as SharedGrid, SortableFavoritesGridProps, SortableFavoriteView} from "@shared/components/favorites/SortableFavoritesGrid";
import {FavoriteGroupRecord, FavoriteRecord, RegexFavoriteRecord, StaticFavoriteRecord} from "@poe/core/favorites/FavoriteTypes";
import {FAVORITE_PAGE_REGISTRY} from "@poe/core/favorites/FavoritePageRegistry";
import {ResolvedFavoriteGroup} from "@shared/core/favorites/FavoriteTypes";

type FavoriteView = ResolvedFavoriteGroup<FavoriteRecord> & SortableFavoriteView;
type SharedProps = Omit<SortableFavoritesGridProps<FavoriteView>, "getSourceIcon" | "onEditRegex" | "onEditGroup" | "onEditStatic">;

export default function SortableFavoritesGrid(props: SharedProps & {onEdit: (favorite: RegexFavoriteRecord) => void; onEditGroup: (favorite: FavoriteGroupRecord) => void; onEditStatic: (favorite: StaticFavoriteRecord) => void}) {
  const {onEdit, onEditGroup, onEditStatic, ...gridProps} = props;
  return <SharedGrid
    {...gridProps}
    getSourceIcon={(favorite) => favorite.kind === "favorite" ? FAVORITE_PAGE_REGISTRY[favorite.pageKey].icon : undefined}
    onEditRegex={(favorite) => { if (favorite.kind === "favorite") onEdit(favorite); }}
    onEditGroup={(favorite) => { if (favorite.kind === "group") onEditGroup(favorite); }}
    onEditStatic={(favorite) => { if (favorite.kind === "static") onEditStatic(favorite); }}
  />;
}
