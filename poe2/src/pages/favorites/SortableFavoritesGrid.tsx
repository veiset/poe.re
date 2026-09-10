import {DndContext, DragEndEvent, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors} from "@dnd-kit/core";
import {SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates} from "@dnd-kit/sortable";
import {FavoriteCard} from "@shared/components/favorites/FavoriteCard";
import {restrictToViewportEdges} from "@shared/core/favorites/restrictToViewportEdges";
import {FAVORITE_PAGE_REGISTRY} from "../../FavoritePageRegistry";
import {Poe2FavoriteRecord} from "../../settings";

export default function SortableFavoritesGrid({favorites, visible, copiedFavoriteId, onCopied, onDetails, onCustomize, onEdit, onMove, onDelete, onReorder}: {
  favorites: Poe2FavoriteRecord[]; visible: Poe2FavoriteRecord[]; copiedFavoriteId?: string; onCopied: (id: string) => void;
  onDetails: (favorite: Poe2FavoriteRecord) => void; onCustomize: (favorite: Poe2FavoriteRecord) => void; onEdit: (favorite: Poe2FavoriteRecord) => void;
  onMove: (id: string, offset: number) => void; onDelete: (favorite: Poe2FavoriteRecord) => void; onReorder: (ids: string[]) => void;
}) {
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
        const page = FAVORITE_PAGE_REGISTRY[favorite.pageKey];
        return <FavoriteCard key={favorite.id} favorite={{...favorite, sourceLabel: page.label, sourceIcon: page.icon}} canMoveEarlier={index > 0} canMoveLater={index < favorites.length - 1} copiedFavoriteId={copiedFavoriteId} onCopied={() => onCopied(favorite.id)} onDetails={() => onDetails(favorite)} onCustomize={() => onCustomize(favorite)} onEdit={() => onEdit(favorite)} onMove={(offset) => onMove(favorite.id, offset)} onDelete={() => onDelete(favorite)}/>;
      })}</div>
    </SortableContext>
  </DndContext>;
}
