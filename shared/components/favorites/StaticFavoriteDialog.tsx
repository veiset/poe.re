import React, { useState } from "react";
import { FavoriteMetadata } from "@shared/core/favorites/FavoriteTypes";
import { FavoriteDialog } from "./FavoriteDialog";

interface StaticFavoriteDialogProps {
  initial?: Partial<FavoriteMetadata> & { regex?: string };
  duplicateNames?: string[];
  onCancel: () => void;
  onSave: (regex: string, metadata: FavoriteMetadata) => void | Promise<void>;
}

export const StaticFavoriteDialog = ({
  initial,
  duplicateNames,
  onCancel,
  onSave,
}: StaticFavoriteDialogProps) => {
  const [regex, setRegex] = useState(initial?.regex ?? "");

  return (
    <FavoriteDialog
      title={
        initial?.regex === undefined ? "Create custom" : "Edit custom favorite"
      }
      initial={{ name: "Custom regex", ...initial }}
      duplicateNames={duplicateNames}
      canSave={Boolean(regex.trim())}
      saveLabel={
        initial?.regex === undefined ? "Create favorite" : "Save favorite"
      }
      onCancel={onCancel}
      onSave={(metadata) => onSave(regex.trim(), metadata)}
    >
      <label className="favorite-dialog-field">
        Regex
        <span className="favorite-dialog-help">
          A custom regex independent of every generator page.
        </span>
        <textarea
          className="favorite-dialog-regex-input"
          value={regex}
          required
          spellCheck={false}
          onChange={(event) => setRegex(event.target.value)}
        />
      </label>
    </FavoriteDialog>
  );
};
