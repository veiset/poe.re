import React, {useEffect, useMemo, useRef, useState} from "react";
import {
  canGroupFavorites, DEFAULT_FAVORITE_COLOR, FAVORITE_COLORS, FavoriteGroupCandidate,
  FavoriteGroupOperator, FavoriteMetadata, favoriteGroupRegexLength, favoriteOrIncompatibility,
  FavoriteResolvableEntry, MAX_FAVORITE_GROUP_REGEX_LENGTH, MAX_FAVORITE_TAG_LENGTH, MAX_FAVORITE_TAGS,
  normalizeFavoriteTags,
} from "@shared/core/favorites/FavoriteTypes";
import "./FavoriteDialog.css";

interface FavoriteGroupDialogProps {
  favorites: FavoriteResolvableEntry[];
  initial?: Partial<FavoriteMetadata> & {memberIds?: string[]; operator?: FavoriteGroupOperator};
  duplicateNames?: string[];
  onCancel: () => void;
  onSave: (memberIds: string[], operator: FavoriteGroupOperator, metadata: FavoriteMetadata) => void | Promise<void>;
}

export const FavoriteGroupDialog = ({favorites, initial, duplicateNames = [], onCancel, onSave}: FavoriteGroupDialogProps) => {
  const [selected, setSelected] = useState<string[]>(initial?.memberIds ?? []);
  const [operator, setOperator] = useState<FavoriteGroupOperator>(initial?.operator ?? "and");
  const [name, setName] = useState(initial?.name ?? "Favorite group");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? DEFAULT_FAVORITE_COLOR);
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  // Keep nesting impossible at the shared UI boundary, even if a caller passes the full favorites list.
  const candidates = useMemo(
    () => favorites.filter((favorite): favorite is FavoriteGroupCandidate => favorite.kind !== "group"),
    [favorites],
  );
  const selectedFavorites = useMemo(() => candidates.filter((favorite) => selected.includes(favorite.id)), [candidates, selected]);
  const candidateIds = useMemo(() => new Set(candidates.map((favorite) => favorite.id)), [candidates]);
  const missingSelected = selected.filter((id) => !candidateIds.has(id));
  const length = favoriteGroupRegexLength(selectedFavorites);
  const compatible = canGroupFavorites(selectedFavorites, operator);
  const hasOrIncompatibility = operator === "or" && selectedFavorites.some((favorite) => favoriteOrIncompatibility(favorite));
  const validSelection = missingSelected.length === 0 && length <= MAX_FAVORITE_GROUP_REGEX_LENGTH && compatible;
  const duplicate = duplicateNames.some((value) => value.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
  const toggle = (id: string) => setSelected((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !validSelection) return;
    setSaving(true); setError("");
    try {
      await onSave(selected, operator, {name: name.trim(), description, color, tags: normalizeFavoriteTags(tagsText.split(","))});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save favorite group");
      setSaving(false);
    }
  };

  return <div className="favorite-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <form className="favorite-dialog favorite-group-dialog" role="dialog" aria-modal="true" aria-labelledby="favorite-group-title" onSubmit={submit} onKeyDown={(event) => { if (event.key === "Escape") onCancel(); }}>
      <h2 id="favorite-group-title">{initial?.memberIds ? "Edit favorite group" : "Create favorite group"}</h2>
      <label className="favorite-dialog-field">Name<input ref={nameRef} value={name} maxLength={80} required onChange={(event) => setName(event.target.value)}/></label>
      {duplicate && <div className="warning">A favorite with this name already exists. Duplicates are allowed.</div>}
      <div className="favorite-dialog-field">Accent color<div className="favorite-dialog-colors" role="radiogroup" aria-label="Accent color">{FAVORITE_COLORS.map((option) => <button key={option} type="button" className="favorite-color-choice" style={{backgroundColor: option}} aria-label={`Use ${option}`} aria-checked={color === option} role="radio" onClick={() => setColor(option)}/>)}</div></div>
      <label className="favorite-dialog-field">Description <span className="favorite-dialog-help">Shown in Details</span><textarea value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)}/></label>
      <label className="favorite-dialog-field">Tags <span className="favorite-dialog-help">Own tags; member tags are inherited automatically. Up to {MAX_FAVORITE_TAGS}, {MAX_FAVORITE_TAG_LENGTH} characters each.</span><input value={tagsText} onChange={(event) => setTagsText(event.target.value)}/></label>
      <p className="favorite-dialog-help">Groups contain at least two individual favorites, not other groups. Combined member regex length may be at most {MAX_FAVORITE_GROUP_REGEX_LENGTH} characters.</p>
      <div className="favorite-group-summary"><strong>{length} / {MAX_FAVORITE_GROUP_REGEX_LENGTH}</strong> characters</div>
      <div className="favorite-group-operator" role="radiogroup" aria-label="Group operator"><label><input type="radio" checked={operator === "and"} onChange={() => setOperator("and")}/> AND</label><label><input type="radio" checked={operator === "or"} onChange={() => setOperator("or")}/> OR</label></div>
      <div className="favorite-group-list">
        {missingSelected.map((id) => <label key={id} className="favorite-group-incompatible">
          <input type="checkbox" checked onChange={() => toggle(id)}/>
          <span className="favorite-group-candidate"><span>Missing favorite</span><small>This reference no longer exists. Deselect it to repair the group.</small></span>
          <span>{id}</span>
        </label>)}
        {candidates.map((favorite) => {
          const checked = selected.includes(favorite.id);
          const nextLength = length + (checked ? -favorite.regex.length : favorite.regex.length);
          const incompatibility = operator === "or" ? favoriteOrIncompatibility(favorite) : undefined;
          const sizeIncompatibility = !checked && nextLength > MAX_FAVORITE_GROUP_REGEX_LENGTH
            ? `Adding this favorite would exceed the ${MAX_FAVORITE_GROUP_REGEX_LENGTH}-character limit.`
            : undefined;
          const blockedReason = incompatibility ?? sizeIncompatibility;
          return <label key={favorite.id} className={blockedReason ? "favorite-group-incompatible" : ""}>
            <input type="checkbox" checked={checked} disabled={!checked && Boolean(blockedReason)} onChange={() => toggle(favorite.id)}/>
            <span className="favorite-group-candidate">
              <span>{favorite.name}</span>
              {blockedReason && <small><span className="favorite-group-blocked-marker" aria-hidden="true">⚠</span>{blockedReason}</small>}
            </span>
            <span>{favorite.regex.length} chars</span>
          </label>;
        })}
      </div>
      {length > MAX_FAVORITE_GROUP_REGEX_LENGTH && <div className="favorite-dialog-error">The selected favorites are over the character limit. Deselect one or more favorites.</div>}
      {missingSelected.length > 0 && <div className="favorite-dialog-error">Remove the missing references before saving this group.</div>}
      {selectedFavorites.length < 2 && <div className="favorite-dialog-error">Select at least two favorites.</div>}
      {hasOrIncompatibility && <div className="favorite-dialog-error">One or more selected favorites cannot be safely combined with OR. Switch to AND or deselect the marked favorites.</div>}
      <div className="favorite-dialog-error" role="alert">{error}</div>
      <div className="favorite-dialog-actions"><button type="button" onClick={onCancel}>Cancel</button><button className="favorite-dialog-save" type="submit" disabled={!name.trim() || !validSelection || saving}>{saving ? "Saving…" : initial?.memberIds ? "Save group" : "Create group"}</button></div>
    </form>
  </div>;
};
