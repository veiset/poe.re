import {DndContext, DragEndEvent, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors} from "@dnd-kit/core";
import {SortableContext, arrayMove, rectSortingStrategy} from "@dnd-kit/sortable";
import {FavoriteCard as SharedFavoriteCard} from "@shared/components/favorites/FavoriteCard";
import {FavoriteRecord} from "@poe/core/favorites/FavoriteTypes";
import {FAVORITE_PAGE_REGISTRY} from "@poe/core/favorites/FavoritePageRegistry";
import {restrictToViewportEdges} from "@shared/core/favorites/restrictToViewportEdges";

export default function SortableFavoritesGrid({favorites, visible, copiedFavoriteId, onCopied, onDetails, onCustomize, onEdit, onMove, onDelete, onReorder}: {
  favorites: FavoriteRecord[]; visible: FavoriteRecord[]; copiedFavoriteId?: string; onCopied: (id: string) => void;
  onDetails: (id: string) => void; onCustomize: (id: string) => void; onEdit: (favorite: FavoriteRecord) => void;
  onMove: (id: string, offset: number) => void; onDelete: (favorite: FavoriteRecord) => void; onReorder: (ids: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}), useSensor(TouchSensor, {activationConstraint: {delay: 180, tolerance: 5}}), useSensor(KeyboardSensor));
  const dragEnd = ({active, over}: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = favorites.findIndex((favorite) => favorite.id === active.id);
    const to = favorites.findIndex((favorite) => favorite.id === over.id);
    if (from >= 0 && to >= 0) onReorder(arrayMove(favorites, from, to).map((favorite) => favorite.id));
  };
  return <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToViewportEdges]} onDragEnd={dragEnd}>
    <SortableContext items={visible.map((favorite) => favorite.id)} strategy={rectSortingStrategy}>
      <div className="favorites-grid">{visible.map((favorite) => {
        const index = favorites.findIndex((candidate) => candidate.id === favorite.id);
        const page = FAVORITE_PAGE_REGISTRY[favorite.pageKey];
        return <SharedFavoriteCard key={favorite.id} favorite={{...favorite, sourceLabel: page.label, sourceIcon: page.icon}} canMoveEarlier={index > 0} canMoveLater={index < favorites.length - 1}
          copiedFavoriteId={copiedFavoriteId} onCopied={() => onCopied(favorite.id)} onDetails={() => onDetails(favorite.id)} onCustomize={() => onCustomize(favorite.id)} onEdit={() => onEdit(favorite)} onMove={(offset) => onMove(favorite.id, offset)} onDelete={() => onDelete(favorite)}/>;
      })}</div>
    </SortableContext>
  </DndContext>;
}
