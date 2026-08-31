import React from "react";
import "./FavoriteTagFilter.css";

interface FavoriteTagFilterProps {
  tags: readonly string[];
  selectedTags: readonly string[];
  onChange: (tags: string[]) => void;
}

export const FavoriteTagFilter = ({tags, selectedTags, onChange}: FavoriteTagFilterProps) => {
  if (tags.length === 0) return null;
  const toggle = (tag: string) => {
    onChange(selectedTags.includes(tag)
      ? selectedTags.filter((value) => value !== tag)
      : [...selectedTags, tag]);
  };

  return (
    <div className="favorite-tag-filter" aria-label="Filter favorites by tag">
      <span className="favorite-tag-filter-label">Tags:</span>
      {tags.map((tag) => <button type="button" key={tag} aria-pressed={selectedTags.includes(tag)} onClick={() => toggle(tag)}>{tag}</button>)}
      {selectedTags.length > 0 && <button className="favorite-tag-filter-clear" type="button" onClick={() => onChange([])}>Clear</button>}
    </div>
  );
};
