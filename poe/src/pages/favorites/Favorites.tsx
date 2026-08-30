import React, {CSSProperties, useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {DndContext, DragEndEvent, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors} from "@dnd-kit/core";
import {SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import Header from "@poe/components/Header";
import {FavoriteDialog} from "@shared/components/favorites/FavoriteDialog";
import {useFavorites} from "@poe/core/favorites/FavoritesContext";
import {FAVORITE_PAGE_REGISTRY} from "@poe/core/favorites/FavoritePageRegistry";
import {FavoriteMetadata, FavoriteRecord} from "@poe/core/favorites/FavoriteTypes";
import "./Favorites.css";

const DetailsDialog = ({favorite, onClose, onCustomize, onEdit}: {favorite: FavoriteRecord; onClose: () => void; onCustomize: () => void; onEdit: () => void}) => {
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
  const copy = () => navigator.clipboard.writeText(favorite.regex).then(() => setCopyStatus("Copied")).catch(() => setCopyStatus("Copy failed"));
  return <div className="favorite-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="favorite-dialog" role="dialog" aria-modal="true" aria-labelledby="favorite-details-title">
      <h2 id="favorite-details-title"><img className="favorite-details-icon" src={page.icon} alt=""/> {favorite.name}</h2>
      {favorite.description && <p className="favorite-details-description">{favorite.description}</p>}
      <dl className="favorite-details-grid">
        <dt>Source</dt><dd>{page.label}</dd>
        {favorite.context.language && <><dt>Language</dt><dd>{favorite.context.language}</dd></>}
        {favorite.context.league && <><dt>League</dt><dd>{favorite.context.league}</dd></>}
        <dt>Created</dt><dd>{new Date(favorite.createdAt).toLocaleString()}</dd>
        <dt>Updated</dt><dd>{new Date(favorite.updatedAt).toLocaleString()}</dd>
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

interface CardProps {
  favorite: FavoriteRecord; index: number; total: number;
  copiedFavoriteId?: string;
  onCopied: () => void; onDetails: () => void; onCustomize: () => void; onDelete: () => void; onMove: (offset: number) => void;
}

const FavoriteCard = ({favorite, index, total, copiedFavoriteId, onCopied, onDetails, onCustomize, onDelete, onMove}: CardProps) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"" | "copied" | "error">("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: favorite.id});
  const page = FAVORITE_PAGE_REGISTRY[favorite.pageKey];
  const style = {"--favorite-accent": favorite.color, transform: CSS.Transform.toString(transform), transition} as CSSProperties;
  const copy = () => {
    navigator.clipboard.writeText(favorite.regex)
      .then(() => { setCopyStatus("copied"); onCopied(); })
      .catch(() => setCopyStatus("error"));
  };
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);
  return <article ref={setNodeRef} id={`favorite-${favorite.id}`} className={`favorite-card${isDragging ? " favorite-card-dragging" : ""}`} style={style}>
    <button className="favorite-card-handle" type="button" title={`Reorder ${favorite.name}`} aria-label={`Reorder ${favorite.name}`} {...attributes} {...listeners}>⠿</button>
    <button className="favorite-card-copy" type="button" title={`Copy ${favorite.name}`} aria-label={`Copy ${favorite.name} regex`} onClick={copy}>
      <span className="favorite-card-top">
        <span className="favorite-card-icon" aria-hidden="true"><img src={page.icon} alt=""/></span>
        <span className="favorite-card-name">{favorite.name}</span>
      </span>
      <span className="favorite-card-source">{page.label}</span>
      <span className="favorite-card-tags">
        {favorite.tags.map((tag) => <span className="favorite-card-tag" key={tag}>{tag}</span>)}
      </span>
    </button>
    <time className="favorite-card-updated" dateTime={favorite.updatedAt} title={new Date(favorite.updatedAt).toLocaleString()}>Modified {new Date(favorite.updatedAt).toLocaleDateString()}</time>
    <button ref={menuButtonRef} className="favorite-card-menu-button" type="button" title={`Actions for ${favorite.name}`} aria-label={`Actions for ${favorite.name}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>⋮</button>
    {(copyStatus === "error" || copiedFavoriteId === favorite.id) && <span className={`favorite-card-copy-state${copyStatus === "error" ? " error" : ""}`} aria-hidden="true">{copyStatus === "error" ? "⚠" : "✓"}</span>}
    <span className="visually-hidden" aria-live="polite">{copyStatus === "error" ? "Copy failed" : copiedFavoriteId === favorite.id ? "Copied" : ""}</span>
    {menuOpen && <div ref={menuRef} className="favorite-card-menu" role="menu" onClick={() => setMenuOpen(false)}>
      <button type="button" role="menuitem" onClick={onDetails}>ⓘ View details</button>
      <button type="button" role="menuitem" onClick={onCustomize}>✎ Customize</button>
      <button type="button" role="menuitem" onClick={() => navigate(`${page.route}?favorite=${encodeURIComponent(favorite.id)}`)}>⚙ Edit regex</button>
      <button type="button" role="menuitem" disabled={index === 0} onClick={() => onMove(-1)}>↑ Move earlier</button>
      <button type="button" role="menuitem" disabled={index === total - 1} onClick={() => onMove(1)}>↓ Move later</button>
      <button className="danger" type="button" role="menuitem" onClick={onDelete}>✕ Delete</button>
    </div>}
  </article>;
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
      {allTags.length > 0 && <div className="favorites-filter" aria-label="Filter favorites by tag">
        <span className="favorites-filter-label">Tags:</span>
        {allTags.map((tag) => <button type="button" key={tag} aria-pressed={selectedTags.includes(tag)} onClick={() => setSelectedTags((selected) => selected.includes(tag) ? selected.filter((value) => value !== tag) : [...selected, tag])}>{tag}</button>)}
        {selectedTags.length > 0 && <button className="favorites-clear-filter" type="button" onClick={() => setSelectedTags([])}>Clear</button>}
      </div>}
      {favorites.length === 0 ? <div className="favorites-empty"><div className="favorites-empty-icon">★</div><h2>No favorites yet</h2><p>Open a generator, configure a regex, then choose <strong>Favorite</strong> in the result bar.</p><Link to="/vendor">Create a vendor regex</Link></div>
        : visible.length === 0 ? <div className="favorites-empty"><p>No favorites match the selected tags.</p><button type="button" onClick={() => setSelectedTags([])}>Clear filters</button></div>
        : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
          <SortableContext items={visible.map((favorite) => favorite.id)} strategy={rectSortingStrategy}>
            <div className="favorites-grid">{visible.map((favorite) => {
              const index = favorites.findIndex((candidate) => candidate.id === favorite.id);
              return <FavoriteCard key={favorite.id} favorite={favorite} index={index} total={favorites.length}
                copiedFavoriteId={copiedFavoriteId} onCopied={() => setCopiedFavoriteId(favorite.id)} onDetails={() => setDetailsId(favorite.id)} onCustomize={() => setCustomizeId(favorite.id)} onMove={(offset) => move(favorite.id, offset)}
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
