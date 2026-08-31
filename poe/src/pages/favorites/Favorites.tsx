import React, {useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {DndContext, DragEndEvent, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors} from "@dnd-kit/core";
import {SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates} from "@dnd-kit/sortable";
import Header from "@poe/components/Header";
import {FavoriteDialog} from "@shared/components/favorites/FavoriteDialog";
import {FavoriteCard as SharedFavoriteCard} from "@shared/components/favorites/FavoriteCard";
import {FavoriteTagFilter} from "@shared/components/favorites/FavoriteTagFilter";
import {useFavorites} from "@poe/core/favorites/FavoritesContext";
import {FAVORITE_PAGE_REGISTRY} from "@poe/core/favorites/FavoritePageRegistry";
import {FavoriteMetadata, FavoriteRecord} from "@poe/core/favorites/FavoriteTypes";
import "./Favorites.css";

interface DetailsDialogProps {
  favorite: FavoriteRecord;
  onClose: () => void;
  onCustomize: () => void;
  onEdit: () => void;
}

const DetailsDialog = ({favorite, onClose, onCustomize, onEdit}: DetailsDialogProps) => {
  const page = FAVORITE_PAGE_REGISTRY[favorite.pageKey];
  const [copyStatus, setCopyStatus] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const copy = () => navigator.clipboard.writeText(favorite.regex)
    .then(() => setCopyStatus("Copied"))
    .catch(() => setCopyStatus("Copy failed"));

  return <div
    className="favorite-dialog-backdrop"
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <section className="favorite-dialog" role="dialog" aria-modal="true" aria-labelledby="favorite-details-title">
      <h2 id="favorite-details-title">
        <img className="favorite-details-icon" src={page.icon} alt=""/> {favorite.name}
      </h2>
      {favorite.description && <p className="favorite-details-description">{favorite.description}</p>}
      <dl className="favorite-details-grid">
        <dt>Source</dt>
        <dd>{page.label}</dd>
        {favorite.context.language && <><dt>Language</dt><dd>{favorite.context.language}</dd></>}
        {favorite.context.league && <><dt>League</dt><dd>{favorite.context.league}</dd></>}
        <dt>Created</dt>
        <dd>{new Date(favorite.createdAt).toLocaleString()}</dd>
        <dt>Updated</dt>
        <dd>{new Date(favorite.updatedAt).toLocaleString()}</dd>
      </dl>
      <div className="favorite-details-regex">{favorite.regex}</div>
      <div aria-live="polite" className="favorite-dialog-help">{copyStatus}</div>
      <div className="favorite-dialog-actions">
        <button ref={closeButtonRef} type="button" onClick={onClose}>Close</button>
        <button type="button" onClick={onCustomize}>Customize</button>
        <button type="button" onClick={onEdit}>Edit regex</button>
        <button type="button" onClick={copy}>Copy regex</button>
      </div>
    </section>
  </div>;
};

const Favorites = () => {
  const {favorites, storageError, updateMetadata, remove, reorder} = useFavorites();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [detailsId, setDetailsId] = useState<string>();
  const [customizeId, setCustomizeId] = useState<string>();
  const [copiedFavoriteId, setCopiedFavoriteId] = useState<string>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const allTags = useMemo(() => [...new Set(favorites.flatMap((favorite) => favorite.tags))].sort((a, b) => a.localeCompare(b)), [favorites]);
  const visible = selectedTags.length ? favorites.filter((favorite) => favorite.tags.some((tag) => selectedTags.includes(tag))) : favorites;
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}), useSensor(TouchSensor, {activationConstraint: {delay: 180, tolerance: 5}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}));

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus) window.setTimeout(() => document.getElementById(`favorite-${focus}`)?.querySelector<HTMLElement>(".favorite-card-copy")?.focus(), 0);
  }, [searchParams, favorites]);

  const move = (id: string, offset: number) => {
    const from = favorites.findIndex((favorite) => favorite.id === id);
    const to = from + offset;
    if (from >= 0 && to >= 0 && to < favorites.length) reorder(arrayMove(favorites, from, to).map((favorite) => favorite.id));
  };
  const dragEnd = ({active, over}: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = favorites.findIndex((favorite) => favorite.id === active.id);
    const to = favorites.findIndex((favorite) => favorite.id === over.id);
    if (from >= 0 && to >= 0) reorder(arrayMove(favorites, from, to).map((favorite) => favorite.id));
  };
  const customize = favorites.find((favorite) => favorite.id === customizeId);
  const details = favorites.find((favorite) => favorite.id === detailsId);

  return <>
    <Header text="Favorites"/>
    <main className={`favorites-page${favorites.length === 0 ? " favorites-page-empty" : ""}`}>
      {storageError && <div className="favorites-storage-error" role="alert">{storageError}</div>}
      <FavoriteTagFilter tags={allTags} selectedTags={selectedTags} onChange={setSelectedTags}/>
      {favorites.length === 0 ? <div className="favorites-empty"><div className="favorites-empty-icon">★</div><h2>No favorites yet</h2><p>Open a generator, configure a regex, then choose <strong>Favorite</strong> in the result bar.</p><Link to="/vendor">Create a vendor regex</Link></div>
        : visible.length === 0 ? <div className="favorites-empty"><p>No favorites match the selected tags.</p><button type="button" onClick={() => setSelectedTags([])}>Clear filters</button></div>
        : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
          <SortableContext items={visible.map((favorite) => favorite.id)} strategy={rectSortingStrategy}>
            <div className="favorites-grid">{visible.map((favorite) => {
              const index = favorites.findIndex((candidate) => candidate.id === favorite.id);
              const page = FAVORITE_PAGE_REGISTRY[favorite.pageKey];
              return <SharedFavoriteCard key={favorite.id} favorite={{...favorite, sourceLabel: page.label, sourceIcon: page.icon}} canMoveEarlier={index > 0} canMoveLater={index < favorites.length - 1}
                copiedFavoriteId={copiedFavoriteId} onCopied={() => setCopiedFavoriteId(favorite.id)} onDetails={() => setDetailsId(favorite.id)} onCustomize={() => setCustomizeId(favorite.id)} onEdit={() => navigate(`${page.route}?favorite=${encodeURIComponent(favorite.id)}`)} onMove={(offset) => move(favorite.id, offset)}
                onDelete={() => { if (window.confirm(`Delete favorite “${favorite.name}”?`)) remove(favorite.id); }}/>
            })}</div>
          </SortableContext>
        </DndContext>}
    </main>
    {details && <DetailsDialog favorite={details} onClose={() => setDetailsId(undefined)} onCustomize={() => { setDetailsId(undefined); setCustomizeId(details.id); }} onEdit={() => navigate(`${FAVORITE_PAGE_REGISTRY[details.pageKey].route}?favorite=${encodeURIComponent(details.id)}`)}/>}
    {customize && <FavoriteDialog title={`Customize ${customize.name}`} initial={customize} duplicateNames={favorites.filter((favorite) => favorite.id !== customize.id).map((favorite) => favorite.name)} onCancel={() => setCustomizeId(undefined)} onSave={(metadata: FavoriteMetadata) => { updateMetadata(customize.id, metadata); setCustomizeId(undefined); }}/>} 
  </>;
};

export default Favorites;
