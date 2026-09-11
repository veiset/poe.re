import React, {lazy, Suspense, useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {HeaderWithLanguage} from "@poe/components/Header";
import {FavoriteDialog} from "@shared/components/favorites/FavoriteDialog";
import {FavoriteTagFilter} from "@shared/components/favorites/FavoriteTagFilter";
import {useFavorites} from "@poe/core/favorites/FavoritesContext";
import {useRenderedFavorites} from "@poe/core/favorites/useRenderedFavorites";
import {FAVORITE_PAGE_REGISTRY} from "@poe/core/favorites/FavoritePageRegistry";
import {FavoriteMetadata, FavoriteRecord} from "@poe/core/favorites/FavoriteTypes";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import "./Favorites.css";
const SortableFavoritesGrid = lazy(() => import("./SortableFavoritesGrid"));

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
  const {lang} = useContext(ProfileContext);
  const renderedFavorites = useRenderedFavorites(favorites, lang);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [detailsId, setDetailsId] = useState<string>();
  const [customizeId, setCustomizeId] = useState<string>();
  const [copiedFavoriteId, setCopiedFavoriteId] = useState<string>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const allTags = useMemo(() => [...new Set(favorites.flatMap((favorite) => favorite.tags))].sort((a, b) => a.localeCompare(b)), [favorites]);
  const visible = selectedTags.length ? favorites.filter((favorite) => favorite.tags.some((tag) => selectedTags.includes(tag))) : favorites;
  const renderedVisible = renderedFavorites.filter((favorite) => visible.some((candidate) => candidate.id === favorite.id));

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus) window.setTimeout(() => document.getElementById(`favorite-${focus}`)?.querySelector<HTMLElement>(".favorite-card-copy")?.focus(), 0);
  }, [searchParams, favorites]);

  const move = (id: string, offset: number) => {
    const from = favorites.findIndex((favorite) => favorite.id === id);
    const to = from + offset;
    if (from >= 0 && to >= 0 && to < favorites.length) {
      const next = [...favorites];
      const [favorite] = next.splice(from, 1);
      next.splice(to, 0, favorite);
      reorder(next.map((entry) => entry.id));
    }
  };
  const customize = favorites.find((favorite) => favorite.id === customizeId);
  const details = renderedFavorites.find((favorite) => favorite.id === detailsId);

  return <>
    <HeaderWithLanguage text="Favorites"/>
    <main className={`favorites-page${favorites.length === 0 ? " favorites-page-empty" : ""}`}>
      {storageError && <div className="favorites-storage-error" role="alert">{storageError}</div>}
      <FavoriteTagFilter tags={allTags} selectedTags={selectedTags} onChange={setSelectedTags}/>
      {favorites.length === 0 ? <div className="favorites-empty"><div className="favorites-empty-icon">★</div><h2>No favorites yet</h2><p>Open a generator, configure a regex, then choose <strong>Favorite</strong> in the result bar.</p><Link to="/vendor">Create a vendor regex</Link></div>
        : visible.length === 0 ? <div className="favorites-empty"><p>No favorites match the selected tags.</p><button type="button" onClick={() => setSelectedTags([])}>Clear filters</button></div>
        : <Suspense fallback={<div className="favorites-grid-loading" role="status">Loading favorites…</div>}><SortableFavoritesGrid favorites={favorites} visible={renderedVisible} copiedFavoriteId={copiedFavoriteId}
          onCopied={setCopiedFavoriteId} onDetails={setDetailsId} onCustomize={setCustomizeId}
          onEdit={(favorite) => navigate(`${FAVORITE_PAGE_REGISTRY[favorite.pageKey].route}?favorite=${encodeURIComponent(favorite.id)}`)} onMove={move}
          onDelete={(favorite) => { if (window.confirm(`Delete favorite “${favorite.name}”?`)) remove(favorite.id); }} onReorder={reorder}/></Suspense>}
    </main>
    {details && <DetailsDialog favorite={details} onClose={() => setDetailsId(undefined)} onCustomize={() => { setDetailsId(undefined); setCustomizeId(details.id); }} onEdit={() => navigate(`${FAVORITE_PAGE_REGISTRY[details.pageKey].route}?favorite=${encodeURIComponent(details.id)}`)}/>}
    {customize && <FavoriteDialog title={`Customize ${customize.name}`} initial={customize} duplicateNames={favorites.filter((favorite) => favorite.id !== customize.id).map((favorite) => favorite.name)} onCancel={() => setCustomizeId(undefined)} onSave={(metadata: FavoriteMetadata) => { updateMetadata(customize.id, metadata); setCustomizeId(undefined); }}/>} 
  </>;
};

export default Favorites;
