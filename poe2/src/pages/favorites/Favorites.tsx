import React, {lazy, Suspense, useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import Poe2Header from "@poe2/components/Poe2Header";
import {FavoriteDialog} from "@shared/components/favorites/FavoriteDialog";
import {FavoriteTagFilter} from "@shared/components/favorites/FavoriteTagFilter";
import {FavoriteMetadata} from "@shared/core/favorites/FavoriteTypes";
import {useFavorites} from "../../FavoritesContext";
import {FAVORITE_PAGE_REGISTRY} from "../../FavoritePageRegistry";
import {Poe2FavoriteRecord} from "../../settings";
import "./Favorites.css";
const SortableFavoritesGrid = lazy(() => import("./SortableFavoritesGrid"));

interface DetailsDialogProps {
  favorite: Poe2FavoriteRecord;
  onClose: () => void;
  onCustomize: () => void;
}

const DetailsDialog = ({favorite, onClose, onCustomize}: DetailsDialogProps) => {
  const navigate = useNavigate();
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

  return (
    <div
      className="favorite-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="favorite-dialog" role="dialog" aria-modal="true" aria-labelledby="poe2-favorite-details-title">
        <h2 id="poe2-favorite-details-title">
          <img className="favorite-details-icon" src={page.icon} alt=""/>
          {favorite.name}
        </h2>
        {favorite.description && <p className="favorite-details-description">{favorite.description}</p>}
        <dl className="favorite-details-grid">
          <dt>Source</dt>
          <dd>{page.label}</dd>
          {favorite.context.league && <>
            <dt>League</dt>
            <dd>{favorite.context.league}</dd>
          </>}
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
          <button type="button" onClick={() => navigate(`${page.route}?favorite=${encodeURIComponent(favorite.id)}`)}>Edit regex</button>
          <button type="button" onClick={copy}>Copy regex</button>
        </div>
      </section>
    </div>
  );
};

const Favorites = () => {
  const {favorites, customize, remove, reorder} = useFavorites();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Poe2FavoriteRecord>();
  const [details, setDetails] = useState<Poe2FavoriteRecord>();
  const [tags, setTags] = useState<string[]>([]);
  const [copiedFavoriteId, setCopiedFavoriteId] = useState<string>();

  const allTags = useMemo(
    () => [...new Set(favorites.flatMap((favorite) => favorite.tags))].sort(),
    [favorites],
  );
  const visibleFavorites = tags.length > 0
    ? favorites.filter((favorite) => favorite.tags.some((tag) => tags.includes(tag)))
    : favorites;

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


  const deleteFavorite = (favorite: Poe2FavoriteRecord) => {
    if (window.confirm(`Delete favorite “${favorite.name}”?`)) {
      remove(favorite.id);
    }
  };

  return (
    <>
      <Poe2Header text="Favorites"/>
      <main className={`poe2-favorites${favorites.length === 0 ? " poe2-favorites-empty-page" : ""}`}>
        <FavoriteTagFilter tags={allTags} selectedTags={tags} onChange={setTags}/>
        {favorites.length === 0 ? (
          <div className="poe2-favorites-empty">
            <div className="poe2-favorites-empty-icon">★</div>
            <h2>No favorites yet</h2>
            <p>Open a generator, configure a regex, then choose <strong>Favorite</strong> in the result bar.</p>
            <Link to="/vendor">Create a vendor regex</Link>
          </div>
        ) : (
          <Suspense fallback={<div className="favorites-grid-loading" role="status">Loading favorites…</div>}><SortableFavoritesGrid favorites={favorites} visible={visibleFavorites} copiedFavoriteId={copiedFavoriteId}
            onCopied={setCopiedFavoriteId} onDetails={setDetails} onCustomize={setEditing} onEdit={(favorite) => navigate(`${FAVORITE_PAGE_REGISTRY[favorite.pageKey].route}?favorite=${encodeURIComponent(favorite.id)}`)}
            onMove={move} onDelete={deleteFavorite} onReorder={reorder}/></Suspense>
        )}
      </main>
      {details && <DetailsDialog
        favorite={details}
        onClose={() => setDetails(undefined)}
        onCustomize={() => {
          setDetails(undefined);
          setEditing(details);
        }}
      />}
      {editing && <FavoriteDialog
        title={`Customize ${editing.name}`}
        initial={editing}
        duplicateNames={favorites.filter((favorite) => favorite.id !== editing.id).map((favorite) => favorite.name)}
        onCancel={() => setEditing(undefined)}
        onSave={(metadata: FavoriteMetadata) => {
          customize(editing.id, metadata);
          setEditing(undefined);
        }}
      />}
    </>
  );
};

export default Favorites;
