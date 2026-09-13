import React, {lazy, Suspense, useMemo, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import Poe2Header from "@poe2/components/Poe2Header";
import {FavoriteDialog} from "@shared/components/favorites/FavoriteDialog";
import {FavoriteGroupDialog} from "@shared/components/favorites/FavoriteGroupDialog";
import {StaticFavoriteDialog} from "@shared/components/favorites/StaticFavoriteDialog";
import {FavoriteDetailsData, FavoriteDetailsDialog} from "@shared/components/favorites/FavoriteDetailsDialog";
import {FavoritesToolbar} from "@shared/components/favorites/FavoritesToolbar";
import {FavoriteMetadata} from "@shared/core/favorites/FavoriteTypes";
import {ResolvedFavoriteGroup, resolveFavoriteGroups} from "@shared/core/favorites/FavoriteTypes";
import {useFavorites} from "../../FavoritesContext";
import {FAVORITE_PAGE_REGISTRY} from "../../FavoritePageRegistry";
import {Poe2FavoriteRecord} from "../../settings";
import {isPoe2FavoriteGroup, isPoe2GroupableFavorite, isPoe2StaticFavorite} from "../../favorites";
import "./Favorites.css";
const SortableFavoritesGrid = lazy(() => import("./SortableFavoritesGrid"));

const Favorites = () => {
  const {favorites, customize, remove, reorder, createGroup, createStatic, updateStatic, duplicate, setHidden, updateGroup} = useFavorites();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Poe2FavoriteRecord>();
  const [details, setDetails] = useState<ResolvedFavoriteGroup<Poe2FavoriteRecord>>();
  const [tags, setTags] = useState<string[]>([]);
  const [copiedFavoriteId, setCopiedFavoriteId] = useState<string>();
  const [groupEditorId, setGroupEditorId] = useState<string | null>();
  const [staticEditorId, setStaticEditorId] = useState<string | null>();
  const [visibilityMode, setVisibilityMode] = useState(false);

  const resolvedFavorites = useMemo(() => resolveFavoriteGroups(favorites), [favorites]);
  const allTags = useMemo(() => [...new Set(resolvedFavorites.filter((favorite) => visibilityMode || !favorite.hidden).flatMap((favorite) => favorite.tags))].sort(), [resolvedFavorites, visibilityMode]);
  const visibleFavorites = tags.length > 0
    ? resolvedFavorites.filter((favorite) => favorite.tags.some((tag) => tags.includes(tag)))
    : resolvedFavorites;
  const shownFavorites = visibilityMode ? resolvedFavorites : visibleFavorites.filter((favorite) => !favorite.hidden);
  const editingEntry = groupEditorId ? favorites.find((favorite) => favorite.id === groupEditorId) : undefined;
  const editingGroup = editingEntry && isPoe2FavoriteGroup(editingEntry) ? editingEntry : undefined;
  const groupCandidates = resolvedFavorites.filter(isPoe2GroupableFavorite);
  const staticEditorEntry = staticEditorId ? favorites.find((favorite) => favorite.id === staticEditorId) : undefined;
  const editingStatic = staticEditorEntry && isPoe2StaticFavorite(staticEditorEntry) ? staticEditorEntry : undefined;
  const detailsData: FavoriteDetailsData | undefined = details ? {
    ...details,
    source: details.kind === "favorite" ? {label: FAVORITE_PAGE_REGISTRY[details.pageKey].label, icon: FAVORITE_PAGE_REGISTRY[details.pageKey].icon} : undefined,
    context: details.kind === "favorite" && details.context.league ? [{label: "League", value: details.context.league}] : undefined,
    group: details.kind === "group" ? details.groupResolution : undefined,
  } : undefined;

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
    const groups = favorites.filter((entry) => isPoe2FavoriteGroup(entry) && entry.memberIds.includes(favorite.id));
    const affected = groups.length ? `\n\nIt is referenced by: ${groups.map((entry) => entry.name).join(", ")}. Those groups will be updated or removed if fewer than two favorites remain.` : "";
    if (window.confirm(`Delete favorite “${favorite.name}”?${affected}`)) remove(favorite.id);
  };

  return (
    <>
      <Poe2Header text="Favorites"/>
      <main className={`poe2-favorites${favorites.length === 0 ? " poe2-favorites-empty-page" : ""}`}>
        <FavoritesToolbar tags={allTags} selectedTags={tags} visibilityMode={visibilityMode} hasFavorites={favorites.length > 0} canCreateGroup={groupCandidates.length >= 2} onTagsChange={setTags} onToggleVisibilityMode={() => setVisibilityMode((value) => !value)} onCreateGroup={() => setGroupEditorId(null)} onCreateStatic={() => setStaticEditorId(null)}/>
        {favorites.length === 0 ? (
          <div className="poe2-favorites-empty">
            <div className="poe2-favorites-empty-icon">★</div>
            <h2>No favorites yet</h2>
            <p>Open a generator, configure a regex, then choose <strong>Favorite</strong> in the result bar.</p>
            <Link to="/vendor">Create a vendor regex</Link>
          </div>
        ) : shownFavorites.length === 0 ? <div className="poe2-favorites-empty">{tags.length ? <><p>No visible favorites match the selected tags.</p><button type="button" onClick={() => setTags([])}>Clear filters</button></> : <><p>All favorites are hidden.</p><button type="button" onClick={() => setVisibilityMode(true)}>Manage visibility</button></>}</div> : (
          <Suspense fallback={<div className="favorites-grid-loading" role="status">Loading favorites…</div>}><SortableFavoritesGrid favorites={resolvedFavorites} visible={shownFavorites} copiedFavoriteId={copiedFavoriteId}
            onCopied={setCopiedFavoriteId} onDetails={setDetails} onCustomize={setEditing} onEdit={(favorite) => navigate(`${FAVORITE_PAGE_REGISTRY[favorite.pageKey].route}?favorite=${encodeURIComponent(favorite.id)}`)}
            onMove={move} onDelete={deleteFavorite} onReorder={reorder} visibilityMode={visibilityMode} onToggleVisibility={(favorite) => setHidden(favorite.id, !favorite.hidden)} onEditGroup={(favorite) => setGroupEditorId(favorite.id)}
            onEditStatic={(favorite) => setStaticEditorId(favorite.id)} onDuplicate={(favorite) => duplicate(favorite.id)}/></Suspense>
        )}
      </main>
      {details && detailsData && <FavoriteDetailsDialog
        favorite={detailsData}
        onClose={() => setDetails(undefined)}
        onCustomize={details.kind === "favorite" ? () => { setDetails(undefined); setEditing(details); } : undefined}
        onEditRegex={details.kind === "favorite"
          ? () => navigate(`${FAVORITE_PAGE_REGISTRY[details.pageKey].route}?favorite=${encodeURIComponent(details.id)}`)
          : details.kind === "static" ? () => { setDetails(undefined); setStaticEditorId(details.id); } : undefined}
        onEditGroup={details.kind === "group" ? () => { setDetails(undefined); setGroupEditorId(details.id); } : undefined}
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
      {groupEditorId !== undefined && <FavoriteGroupDialog
        favorites={resolvedFavorites}
        initial={editingGroup}
        duplicateNames={favorites.filter((favorite) => favorite.id !== editingGroup?.id).map((favorite) => favorite.name)}
        onCancel={() => setGroupEditorId(undefined)}
        onSave={(ids, operator, metadata) => { if (editingGroup) updateGroup(editingGroup.id, ids, operator, metadata); else createGroup(ids, operator, metadata); setGroupEditorId(undefined); }}
      />}
      {staticEditorId !== undefined && <StaticFavoriteDialog
        initial={editingStatic}
        duplicateNames={favorites.filter((favorite) => favorite.id !== editingStatic?.id).map((favorite) => favorite.name)}
        onCancel={() => setStaticEditorId(undefined)}
        onSave={(regex, metadata) => {
          if (editingStatic) updateStatic(editingStatic.id, regex, metadata);
          else createStatic(regex, metadata);
          setStaticEditorId(undefined);
        }}
      />}
    </>
  );
};

export default Favorites;
