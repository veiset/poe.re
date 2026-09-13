import React, {lazy, Suspense, useContext, useEffect, useMemo, useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {HeaderWithLanguage} from "@poe/components/Header";
import {FavoriteDialog} from "@shared/components/favorites/FavoriteDialog";
import {FavoriteGroupDialog} from "@shared/components/favorites/FavoriteGroupDialog";
import {StaticFavoriteDialog} from "@shared/components/favorites/StaticFavoriteDialog";
import {FavoriteDetailsData, FavoriteDetailsDialog} from "@shared/components/favorites/FavoriteDetailsDialog";
import {FavoritesToolbar} from "@shared/components/favorites/FavoritesToolbar";
import {useFavorites} from "@poe/core/favorites/FavoritesContext";
import {useRenderedFavorites} from "@poe/core/favorites/useRenderedFavorites";
import {FAVORITE_PAGE_REGISTRY} from "@poe/core/favorites/FavoritePageRegistry";
import {FavoriteMetadata, FavoriteRecord, isFavoriteGroup, isGroupableFavorite, isRegexFavorite, isStaticFavorite} from "@poe/core/favorites/FavoriteTypes";
import {resolveFavoriteGroups} from "@shared/core/favorites/FavoriteTypes";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import "./Favorites.css";
const SortableFavoritesGrid = lazy(() => import("./SortableFavoritesGrid"));

const Favorites = () => {
  const {favorites, storageError, updateMetadata, remove, reorder, createGroup, createStatic, updateStatic, duplicate, setHidden, updateGroup} = useFavorites();
  const {lang} = useContext(ProfileContext);
  const renderedFavorites = useRenderedFavorites(favorites, lang);
  const resolvedFavorites = useMemo(() => resolveFavoriteGroups(renderedFavorites), [renderedFavorites]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [detailsId, setDetailsId] = useState<string>();
  const [customizeId, setCustomizeId] = useState<string>();
  const [copiedFavoriteId, setCopiedFavoriteId] = useState<string>();
  const [groupEditorId, setGroupEditorId] = useState<string | null>();
  const [staticEditorId, setStaticEditorId] = useState<string | null>();
  const [visibilityMode, setVisibilityMode] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const allTags = useMemo(() => [...new Set(resolvedFavorites.filter((favorite) => visibilityMode || !favorite.hidden).flatMap((favorite) => favorite.tags))].sort((a, b) => a.localeCompare(b)), [resolvedFavorites, visibilityMode]);
  const visible = visibilityMode ? resolvedFavorites : (selectedTags.length ? resolvedFavorites.filter((favorite) => favorite.tags.some((tag) => selectedTags.includes(tag))) : resolvedFavorites).filter((favorite) => !favorite.hidden);

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
  const details = resolvedFavorites.find((favorite) => favorite.id === detailsId);
  const editingEntry = groupEditorId ? favorites.find((favorite) => favorite.id === groupEditorId) : undefined;
  const editingGroup = editingEntry && isFavoriteGroup(editingEntry) ? editingEntry : undefined;
  const groupCandidates = resolvedFavorites.filter(isGroupableFavorite);
  const staticEditorEntry = staticEditorId ? favorites.find((favorite) => favorite.id === staticEditorId) : undefined;
  const editingStatic = staticEditorEntry && isStaticFavorite(staticEditorEntry) ? staticEditorEntry : undefined;
  const detailsData: FavoriteDetailsData | undefined = details ? {
    ...details,
    source: details.kind === "favorite" ? {label: FAVORITE_PAGE_REGISTRY[details.pageKey].label, icon: FAVORITE_PAGE_REGISTRY[details.pageKey].icon} : undefined,
    context: details.kind === "favorite" ? [
      {label: "Language", value: details.context.language},
      {label: "League", value: details.context.league},
    ].filter((row): row is {label: string; value: string} => Boolean(row.value)) : undefined,
    group: details.kind === "group" ? details.groupResolution : undefined,
  } : undefined;

  const deleteFavorite = (favorite: FavoriteRecord) => {
    const groups = favorites.filter((entry) => isFavoriteGroup(entry) && entry.memberIds.includes(favorite.id));
    const affected = groups.length ? `\n\nIt is referenced by: ${groups.map((entry) => entry.name).join(", ")}. Those groups will be updated or removed if fewer than two favorites remain.` : "";
    if (window.confirm(`Delete favorite “${favorite.name}”?${affected}`)) remove(favorite.id);
  };

  return <>
    <HeaderWithLanguage text="Favorites"/>
    <main className={`favorites-page${favorites.length === 0 ? " favorites-page-empty" : ""}`}>
      {storageError && <div className="favorites-storage-error" role="alert">{storageError}</div>}
      <FavoritesToolbar tags={allTags} selectedTags={selectedTags} visibilityMode={visibilityMode} hasFavorites={favorites.length > 0} canCreateGroup={groupCandidates.length >= 2} onTagsChange={setSelectedTags} onToggleVisibilityMode={() => setVisibilityMode((value) => !value)} onCreateGroup={() => setGroupEditorId(null)} onCreateStatic={() => setStaticEditorId(null)}/>
      {favorites.length === 0 ? <div className="favorites-empty"><div className="favorites-empty-icon">★</div><h2>No favorites yet</h2><p>Open a generator, configure a regex, then choose <strong>Favorite</strong> in the result bar.</p><Link to="/vendor">Create a vendor regex</Link></div>
        : visible.length === 0 ? <div className="favorites-empty">{selectedTags.length ? <><p>No visible favorites match the selected tags.</p><button type="button" onClick={() => setSelectedTags([])}>Clear filters</button></> : <><p>All favorites are hidden.</p><button type="button" onClick={() => setVisibilityMode(true)}>Manage visibility</button></>}</div>
        : <Suspense fallback={<div className="favorites-grid-loading" role="status">Loading favorites…</div>}><SortableFavoritesGrid favorites={favorites} visible={visible} copiedFavoriteId={copiedFavoriteId}
          onCopied={setCopiedFavoriteId} onDetails={(favorite) => setDetailsId(favorite.id)} onCustomize={(favorite) => setCustomizeId(favorite.id)}
          onEdit={(favorite) => navigate(`${FAVORITE_PAGE_REGISTRY[favorite.pageKey].route}?favorite=${encodeURIComponent(favorite.id)}`)} onMove={move}
          onDelete={deleteFavorite} onReorder={reorder} visibilityMode={visibilityMode} onToggleVisibility={(favorite) => setHidden(favorite.id, !favorite.hidden)} onEditGroup={(favorite) => setGroupEditorId(favorite.id)}
          onEditStatic={(favorite) => setStaticEditorId(favorite.id)} onDuplicate={(favorite) => duplicate(favorite.id)}/></Suspense>}
    </main>
    {details && detailsData && <FavoriteDetailsDialog
      favorite={detailsData}
      onClose={() => setDetailsId(undefined)}
      onCustomize={details.kind === "favorite" ? () => { setDetailsId(undefined); setCustomizeId(details.id); } : undefined}
      onEditRegex={details.kind === "favorite"
        ? () => navigate(`${FAVORITE_PAGE_REGISTRY[details.pageKey].route}?favorite=${encodeURIComponent(details.id)}`)
        : details.kind === "static" ? () => { setDetailsId(undefined); setStaticEditorId(details.id); } : undefined}
      onEditGroup={details.kind === "group" ? () => { setDetailsId(undefined); setGroupEditorId(details.id); } : undefined}
    />}
    {customize && <FavoriteDialog title={`Customize ${customize.name}`} initial={customize} duplicateNames={favorites.filter((favorite) => favorite.id !== customize.id).map((favorite) => favorite.name)} onCancel={() => setCustomizeId(undefined)} onSave={(metadata: FavoriteMetadata) => { updateMetadata(customize.id, metadata); setCustomizeId(undefined); }}/>}
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
  </>;
};

export default Favorites;
