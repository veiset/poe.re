import React from "react";
import {
  FavoriteGroupCandidate,
  FavoriteGroupOperator,
  favoriteOrIncompatibility,
  MAX_FAVORITE_GROUP_REGEX_LENGTH,
} from "@shared/core/favorites/FavoriteTypes";

interface FavoriteGroupCandidatesProps {
  candidates: readonly FavoriteGroupCandidate[];
  missingSelected: readonly string[];
  selectedIds: readonly string[];
  operator: FavoriteGroupOperator;
  selectedRegexLength: number;
  onToggle: (id: string) => void;
}

export const FavoriteGroupCandidates = ({
  candidates,
  missingSelected,
  selectedIds,
  operator,
  selectedRegexLength,
  onToggle,
}: FavoriteGroupCandidatesProps) => <div className="favorite-group-list">
  {missingSelected.map((id) => <label key={id} className="favorite-group-incompatible">
    <input type="checkbox" checked onChange={() => onToggle(id)}/>
    <span className="favorite-group-candidate"><span>Missing favorite</span><small>This reference no longer exists. Deselect it to repair the group.</small></span>
    <span>{id}</span>
  </label>)}
  {candidates.map((favorite) => {
    const checked = selectedIds.includes(favorite.id);
    const nextLength = selectedRegexLength + (checked ? -favorite.regex.length : favorite.regex.length);
    const operatorIncompatibility = operator === "or" ? favoriteOrIncompatibility(favorite) : undefined;
    const sizeIncompatibility = !checked && nextLength > MAX_FAVORITE_GROUP_REGEX_LENGTH
      ? `Adding this favorite would exceed the ${MAX_FAVORITE_GROUP_REGEX_LENGTH}-character limit.`
      : undefined;
    const blockedReason = operatorIncompatibility ?? sizeIncompatibility;

    return <label key={favorite.id} className={blockedReason ? "favorite-group-incompatible" : ""}>
      <input type="checkbox" checked={checked} disabled={!checked && Boolean(blockedReason)} onChange={() => onToggle(favorite.id)}/>
      <span className="favorite-group-candidate">
        <span>{favorite.name}</span>
        {blockedReason && <small><span className="favorite-group-blocked-marker" aria-hidden="true">⚠</span>{blockedReason}</small>}
      </span>
      <span>{favorite.regex.length} chars</span>
    </label>;
  })}
</div>;
