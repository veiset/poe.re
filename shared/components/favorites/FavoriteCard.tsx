import React, {CSSProperties, useEffect, useRef, useState} from "react";
import {useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import "./FavoriteCard.css";

export interface FavoriteCardData {
  id: string;
  name: string;
  regex: string;
  color: string;
  tags: string[];
  updatedAt: string;
  sourceIcon?: string;
  iconVariant?: "regex";
  regexLength?: number;
  error?: string;
}

interface FavoriteCardProps {
  favorite: FavoriteCardData;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  copiedFavoriteId?: string;
  onCopied: () => void;
  onDetails: () => void;
  onCustomize?: () => void;
  onEdit: () => void;
  canEdit?: boolean;
  visibilityMode?: boolean;
  hidden?: boolean;
  onToggleVisibility?: () => void;
  onEditGroup?: () => void;
  onDuplicate: () => void;
  onMove: (offset: number) => void;
  onDelete: () => void;
}

const VisibilityIcon = ({hidden}: {hidden: boolean}) => hidden ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.7 10.7 0 0112 4c5.5 0 9 5 9 5a16 16 0 01-2.2 2.7M6.2 6.2C4.1 7.5 3 9 3 9s3.5 5 9 5c1 0 2-.2 2.8-.5"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z"/><circle cx="12" cy="12" r="2.5"/></svg>;

export const FavoriteCard = ({
  favorite,
  canMoveEarlier,
  canMoveLater,
  copiedFavoriteId,
  onCopied,
  onDetails,
  onCustomize,
  onEdit,
  canEdit = true,
  visibilityMode = false,
  hidden = false,
  onToggleVisibility,
  onEditGroup,
  onDuplicate,
  onMove,
  onDelete,
}: FavoriteCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"" | "error">("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: favorite.id, disabled: visibilityMode});
  const style = {
    "--favorite-accent": favorite.color,
    transform: CSS.Transform.toString(transform),
    transition,
  } as CSSProperties;

  const copy = () => navigator.clipboard.writeText(favorite.regex)
    .then(() => {
      setCopyStatus("");
      onCopied();
    })
    .catch(() => setCopyStatus("error"));
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

  return (
    <article ref={setNodeRef} id={`favorite-${favorite.id}`} className={`favorite-card${isDragging ? " favorite-card-dragging" : ""}${visibilityMode ? " favorite-card-visibility-mode" : ""}${hidden ? " favorite-card-hidden" : ""}`} style={style}>
      <button className="favorite-card-handle" type="button" title={`Reorder ${favorite.name}`} aria-label={`Reorder ${favorite.name}`} disabled={visibilityMode} {...attributes} {...listeners}>⠿</button>
      <button className="favorite-card-copy" type="button" title={favorite.error ?? `Copy ${favorite.name}`} aria-label={`Copy ${favorite.name} regex`} disabled={visibilityMode || Boolean(favorite.error)} onClick={copy}>
        <span className="favorite-card-top">
          <span className="favorite-card-icon" aria-hidden="true">{favorite.sourceIcon
            ? <img src={favorite.sourceIcon} alt=""/>
            : favorite.iconVariant === "regex" ? <span className="favorite-card-regex-icon">.*</span> : "★"}</span>
          <span className="favorite-card-name">{favorite.name}</span>
        </span>
        <span className="favorite-card-meta">
          <span title={`${favorite.regexLength ?? favorite.regex.length} characters in this regex`}>{favorite.regexLength ?? favorite.regex.length} chars</span>
          <span>-</span>
          <time className="favorite-card-updated" dateTime={favorite.updatedAt} title={new Date(favorite.updatedAt).toLocaleString()}>
            Modified {new Date(favorite.updatedAt).toLocaleDateString()}
          </time>
        </span>
        <span className="favorite-card-tags">
          {favorite.tags.map((tag) => <span className="favorite-card-tag" key={tag}>{tag}</span>)}
        </span>
        {favorite.error && <span className="favorite-card-warning">⚠ {favorite.error}</span>}
        {visibilityMode && <span className="favorite-card-visibility-state">{hidden ? "Hidden" : "Visible"}</span>}
      </button>
      {visibilityMode ? <button className="favorite-card-menu-button favorite-card-visibility-button" type="button" title={hidden ? `Show ${favorite.name}` : `Hide ${favorite.name}`} aria-label={hidden ? `Show ${favorite.name}` : `Hide ${favorite.name}`} aria-pressed={!hidden} onClick={onToggleVisibility}><VisibilityIcon hidden={hidden}/></button> : <button ref={menuButtonRef} className="favorite-card-menu-button" type="button" title={`Actions for ${favorite.name}`} aria-label={`Actions for ${favorite.name}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>⋮</button>}
      {(copyStatus === "error" || copiedFavoriteId === favorite.id) && <span className={`favorite-card-copy-state${copyStatus === "error" ? " error" : ""}`} aria-hidden="true">{copyStatus === "error" ? "⚠" : "✓"}</span>}
      <span className="visually-hidden" aria-live="polite">{copyStatus === "error" ? "Copy failed" : copiedFavoriteId === favorite.id ? "Copied" : ""}</span>
      {menuOpen && <div ref={menuRef} className="favorite-card-menu" role="menu" onClick={() => setMenuOpen(false)}>
        <button type="button" role="menuitem" onClick={onDetails}>ⓘ View details</button>
        {onCustomize && <button type="button" role="menuitem" onClick={onCustomize}>✎ Customize</button>}
        {canEdit && <button type="button" role="menuitem" onClick={onEdit}>⚙ Edit regex</button>}
        {onEditGroup && <button type="button" role="menuitem" onClick={onEditGroup}>⚙ Edit group</button>}
        <button type="button" role="menuitem" onClick={onDuplicate}>⧉ Duplicate</button>
        <button type="button" role="menuitem" disabled={!canMoveEarlier} onClick={() => onMove(-1)}>↑ Move earlier</button>
        <button type="button" role="menuitem" disabled={!canMoveLater} onClick={() => onMove(1)}>↓ Move later</button>
        <button className="danger" type="button" role="menuitem" onClick={onDelete}>✕ Delete</button>
      </div>}
    </article>
  );
};
