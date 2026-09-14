import { FavoriteTagFilter } from "./FavoriteTagFilter";

interface FavoritesToolbarProps {
  tags: readonly string[];
  selectedTags: readonly string[];
  visibilityMode: boolean;
  hasFavorites: boolean;
  canCreateGroup: boolean;
  onTagsChange: (tags: string[]) => void;
  onToggleVisibilityMode: () => void;
  onCreateGroup: () => void;
  onCreateStatic: () => void;
}

export const FavoritesToolbar = ({
  tags,
  selectedTags,
  visibilityMode,
  hasFavorites,
  canCreateGroup,
  onTagsChange,
  onToggleVisibilityMode,
  onCreateGroup,
  onCreateStatic,
}: FavoritesToolbarProps) => {
  if (!hasFavorites) return null;

  return (
    <div
      className={`favorites-toolbar${visibilityMode ? " favorites-toolbar-visibility" : ""}`}
    >
      {visibilityMode ? (
        <span className="favorites-visibility-help">
          All favorites are shown. Use each eye button to hide or show it.
        </span>
      ) : (
        <FavoriteTagFilter
          tags={tags}
          selectedTags={selectedTags}
          onChange={onTagsChange}
        />
      )}
      <div className="favorites-toolbar-actions">
        <button
          type="button"
          className={`favorites-action-visibility${visibilityMode ? " active" : ""}`}
          aria-pressed={visibilityMode}
          onClick={onToggleVisibilityMode}
        >
          {visibilityMode ? (
            "Done managing visibility"
          ) : (
            <>
              <span className="favorites-visibility-icon" aria-hidden="true" />
              Manage visibility
            </>
          )}
        </button>
        <button
          type="button"
          className="favorites-action-static"
          onClick={onCreateStatic}
        >
          Create custom
        </button>
        <button
          type="button"
          className="favorites-action-group"
          disabled={!canCreateGroup}
          title={
            canCreateGroup
              ? "Create a favorite group"
              : "At least two individual favorites are required"
          }
          onClick={onCreateGroup}
        >
          Create group
        </button>
      </div>
    </div>
  );
};
