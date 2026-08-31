import React, {useEffect, useRef, useState} from "react";
import "./FavoriteDialog.css";
import {DEFAULT_FAVORITE_COLOR, FAVORITE_COLORS, FavoriteMetadata, MAX_FAVORITE_TAG_LENGTH, MAX_FAVORITE_TAGS, normalizeFavoriteTags} from "@shared/core/favorites/FavoriteTypes";

interface FavoriteDialogProps {
  title: string;
  initial?: Partial<FavoriteMetadata>;
  duplicateNames?: string[];
  onCancel: () => void;
  onSave: (metadata: FavoriteMetadata) => void | Promise<void>;
}

export const FavoriteDialog = ({title, initial, duplicateNames = [], onCancel, onSave}: FavoriteDialogProps) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? DEFAULT_FAVORITE_COLOR);
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const tags = normalizeFavoriteTags(tagsText.split(","));
  const duplicate = duplicateNames.some((value) => value.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    try {
      await onSave({name: name.trim(), description, color, tags});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save favorite");
      setSaving(false);
    }
  };

  return <div className="favorite-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <form className="favorite-dialog" role="dialog" aria-modal="true" aria-labelledby="favorite-dialog-title" onSubmit={submit} onKeyDown={(event) => { if (event.key === "Escape") onCancel(); }}>
      <h2 id="favorite-dialog-title">{title}</h2>
      <div className="favorite-dialog-field">Accent color
        <div className="favorite-dialog-colors" role="radiogroup" aria-label="Accent color">
          {FAVORITE_COLORS.map((option) => <button key={option} type="button" className="favorite-color-choice" style={{backgroundColor: option}} aria-label={`Use ${option}`} aria-checked={color === option} role="radio" onClick={() => setColor(option)}/>)}
        </div>
      </div>
      <label className="favorite-dialog-field">Name
        <input ref={nameRef} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} required/>
      </label>
      {duplicate && <div className="warning">A favorite with this name already exists. Duplicates are allowed.</div>}
      <label className="favorite-dialog-field">Description <span className="favorite-dialog-help">Shown in Details</span>
        <textarea value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)}/>
      </label>
      <label className="favorite-dialog-field">Tags <span className="favorite-dialog-help">Comma-separated, up to {MAX_FAVORITE_TAGS}; {MAX_FAVORITE_TAG_LENGTH} characters each</span>
        <input value={tagsText} onChange={(event) => setTagsText(event.target.value)}/>
      </label>
      <div className="favorite-dialog-error" role="alert">{error}</div>
      <div className="favorite-dialog-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button className="favorite-dialog-save" type="submit" disabled={!name.trim() || saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </form>
  </div>;
};
