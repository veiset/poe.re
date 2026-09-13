import React, {useEffect, useRef, useState} from "react";
import {FavoriteGroupResolution, favoriteGroupIssueText} from "@shared/core/favorites/FavoriteTypes";
import "./FavoriteDialog.css";

export interface FavoriteDetailsData {
  name: string;
  description: string;
  regex: string;
  createdAt: string;
  updatedAt: string;
  source?: {label: string; icon: string};
  context?: Array<{label: string; value: string}>;
  group?: FavoriteGroupResolution;
}

export const FavoriteDetailsDialog = ({favorite, onClose, onCustomize, onEditRegex, onEditGroup}: {
  favorite: FavoriteDetailsData;
  onClose: () => void;
  onCustomize?: () => void;
  onEditRegex?: () => void;
  onEditGroup?: () => void;
}) => {
  const [copyStatus, setCopyStatus] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const invalidReason = favorite.group ? favoriteGroupIssueText(favorite.group) : undefined;
  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const copy = () => navigator.clipboard.writeText(favorite.regex).then(() => setCopyStatus("Copied")).catch(() => setCopyStatus("Copy failed"));

  return <div className="favorite-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="favorite-dialog" role="dialog" aria-modal="true" aria-labelledby="favorite-details-title">
      <h2 id="favorite-details-title">{favorite.source && <img className="favorite-details-icon" src={favorite.source.icon} alt=""/>}{favorite.name}</h2>
      {favorite.description && <p className="favorite-details-description">{favorite.description}</p>}
      <dl className="favorite-details-grid">
        {favorite.source && <><dt>Source</dt><dd>{favorite.source.label}</dd></>}
        {favorite.context?.map((row) => <React.Fragment key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></React.Fragment>)}
        {favorite.group && <><dt>Operator</dt><dd>{favorite.group.operator.toUpperCase()}</dd><dt>Combined length</dt><dd>{favorite.group.regexLength} / 250</dd><dt>Favorites</dt><dd><ul className="favorite-details-members">{favorite.group.members.map((member) => <li key={member.id}>{member.name}</li>)}{favorite.group.missingIds.map((id) => <li key={id} className="error">Missing favorite ({id})</li>)}</ul></dd></>}
        <dt>Created</dt><dd>{new Date(favorite.createdAt).toLocaleString()}</dd>
        <dt>Updated</dt><dd>{new Date(favorite.updatedAt).toLocaleString()}</dd>
      </dl>
      {invalidReason && <div className="favorite-group-warning" role="alert">{invalidReason}</div>}
      <div className="favorite-details-regex">{favorite.regex || "No valid combined regex"}</div>
      <div aria-live="polite" className="favorite-dialog-help">{copyStatus}</div>
      <div className="favorite-dialog-actions"><button ref={closeButtonRef} type="button" onClick={onClose}>Close</button>{onCustomize && <button type="button" onClick={onCustomize}>Customize</button>}{onEditRegex && <button type="button" onClick={onEditRegex}>Edit regex</button>}{onEditGroup && <button type="button" onClick={onEditGroup}>Edit group</button>}<button type="button" onClick={copy} disabled={Boolean(invalidReason)}>Copy regex</button></div>
    </section>
  </div>;
};
