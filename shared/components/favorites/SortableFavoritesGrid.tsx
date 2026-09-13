import {closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors} from "@dnd-kit/core";
import {arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, SortableContext} from "@dnd-kit/sortable";
import {FavoriteGroupResolution, favoriteGroupIssueText} from "@shared/core/favorites/FavoriteTypes";
import {restrictToViewportEdges} from "@shared/core/favorites/restrictToViewportEdges";
import {FavoriteCard, FavoriteCardData} from "./FavoriteCard";

export type SortableFavoriteView = FavoriteCardData & {
  kind: "favorite" | "static" | "group";
  hidden?: boolean;
  groupResolution?: FavoriteGroupResolution;
};

export interface SortableFavoritesGridProps<T extends SortableFavoriteView> {
  favorites: Array<{id: string}>;
  visible: T[];
  copiedFavoriteId?: string;
  visibilityMode: boolean;
  getSourceIcon: (favorite: T) => string | undefined;
  onCopied: (id: string) => void;
  onDetails: (favorite: T) => void;
  onCustomize: (favorite: T) => void;
  onEditRegex: (favorite: T) => void;
  onEditGroup: (favorite: T) => void;
  onEditStatic: (favorite: T) => void;
  onDuplicate: (favorite: T) => void;
  onMove: (id: string, offset: number) => void;
  onDelete: (favorite: T) => void;
  onReorder: (ids: string[]) => void;
  onToggleVisibility: (favorite: T) => void;
}

export const SortableFavoritesGrid = <T extends SortableFavoriteView>({favorites, visible, copiedFavoriteId, visibilityMode, getSourceIcon, onCopied, onDetails, onCustomize, onEditRegex, onEditGroup, onEditStatic, onDuplicate, onMove, onDelete, onReorder, onToggleVisibility}: SortableFavoritesGridProps<T>) => {
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}), useSensor(TouchSensor, {activationConstraint: {delay: 180, tolerance: 5}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}));
  const dragEnd = ({active, over}: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = favorites.findIndex((favorite) => favorite.id === active.id);
    const to = favorites.findIndex((favorite) => favorite.id === over.id);
    if (from >= 0 && to >= 0) onReorder(arrayMove(favorites, from, to).map((favorite) => favorite.id));
  };
  return <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToViewportEdges]} onDragEnd={dragEnd}>
    <SortableContext items={visible.map((favorite) => favorite.id)} strategy={rectSortingStrategy}>
      <div className="favorites-grid">{visible.map((favorite) => {
        const index = favorites.findIndex((entry) => entry.id === favorite.id);
        const groupError = favorite.kind === "group" && favorite.groupResolution
          ? favoriteGroupIssueText(favorite.groupResolution)
          : undefined;
        return <FavoriteCard key={favorite.id} favorite={{...favorite, sourceIcon: getSourceIcon(favorite), iconVariant: favorite.kind === "static" ? "regex" : undefined, regexLength: favorite.kind === "group" ? favorite.groupResolution?.regexLength : undefined, error: groupError}} canMoveEarlier={index > 0} canMoveLater={index < favorites.length - 1} copiedFavoriteId={copiedFavoriteId} onCopied={() => onCopied(favorite.id)} onDetails={() => onDetails(favorite)} onCustomize={favorite.kind === "favorite" ? () => onCustomize(favorite) : undefined} onEdit={() => favorite.kind === "static" ? onEditStatic(favorite) : onEditRegex(favorite)} canEdit={favorite.kind !== "group"} onEditGroup={favorite.kind === "group" ? () => onEditGroup(favorite) : undefined} onDuplicate={() => onDuplicate(favorite)} visibilityMode={visibilityMode} hidden={favorite.hidden} onToggleVisibility={() => onToggleVisibility(favorite)} onMove={(offset) => onMove(favorite.id, offset)} onDelete={() => onDelete(favorite)}/>;
      })}</div>
    </SortableContext>
  </DndContext>;
};
