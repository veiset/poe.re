import React, { useMemo, useState } from "react";
import { SavedSettings } from "../../utils/SavedSettings";
import {decodeProfile} from "./ProfileTransfer";

interface ProfileImportBoxProps {
  existingProfiles: string[];
  setShow: (n: boolean) => void;
  onImport: (settings: SavedSettings) => void;
}

const ProfileImportBox = (props: ProfileImportBoxProps) => {
  const { existingProfiles, setShow, onImport } = props;

  const [importString, setImportString] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [pendingOverwrite, setPendingOverwrite] = useState<SavedSettings | null>(null);
  const [overrideName, setOverrideName] = useState("");

  // LIVE PREVIEW: Attempt to parse the string as soon as the user pastes it.
  const parsedPreview = useMemo(() => {
    if (!importString.trim()) return null;
    try {
      const parsed = decodeProfile(importString);

      // Basic check to ensure it's a valid profile object before returning
      if (parsed && typeof parsed === "object" && parsed.name) {
        return parsed;
      }
    } catch (e) {
      // Fail silently during live preview; we'll catch actual errors on button click
      return null;
    }
    return null;
  }, [importString]);

  // Helper function to render the metadata card consistently
  const renderMetadata = (profile: SavedSettings) => {
    // Safely calculate the total IDs, falling back to 0 if the map or arrays are missing
    const goodCount = profile.map?.goodIds?.length || 0;
    const badCount = profile.map?.badIds?.length || 0;
    const totalIds = goodCount + badCount;

    return (
      <div style={{
        marginTop: "12px",
        padding: "10px 12px",
        backgroundColor: "rgba(0, 0, 0, 0.04)",
        borderRadius: "var(--btn-radius, 6px)",
        border: "1px solid rgba(0,0,0,0.08)",
        fontSize: "0.9em"
      }}>
        <div style={{ marginBottom: "6px", fontWeight: "bold", opacity: 0.8 }}>Profile Metadata:</div>
        <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "6px 4px" }}>
          <span style={{ opacity: 0.7 }}>Name:</span>
          <strong>{profile.name}</strong>

          <span style={{ opacity: 0.7 }}>Language:</span>
          <strong>{profile.language || "Not specified"}</strong>

          <span style={{ opacity: 0.7 }}>Selected map mods:</span>
          <strong>{totalIds} <span style={{opacity: 0.6, fontWeight: "normal"}}>(Total)</span></strong>

          <span style={{ opacity: 0.7 }}>Schema version:</span>
          <strong>{profile.version || "Not specified"}</strong>
        </div>
      </div>
    );
  };

  const handleImportClick = () => {
    setError(null);

    if (!importString.trim()) {
      setError("Please paste an export string.");
      return;
    }

    if (!parsedPreview) {
      setError("Invalid or corrupted import string. Please check what you pasted.");
      return;
    }

    // Since parsedPreview already validated the string, we can safely use it!
    if (existingProfiles.includes(parsedPreview.name)) {
      setPendingOverwrite(parsedPreview);
      setOverrideName(parsedPreview.name);
    } else {
      onImport(parsedPreview);
    }
  };

  const confirmImport = () => {
    if (pendingOverwrite && overrideName.trim()) {
      const finalProfile = { ...pendingOverwrite, name: overrideName.trim() };
      onImport(finalProfile);
    }
  };

  const isOverwriting = existingProfiles.includes(overrideName.trim());

  return (
    <div className="new-profile-box export-profile-box">
      <div className="profile-header">⍗ Import Profile</div>

      <div className="profile-input-area">
        {pendingOverwrite ? (
          <div style={{ padding: "10px 0" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "1.1em", fontWeight: "bold" }}>
              Profile "{pendingOverwrite.name}" already exists!
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: "0.9em", opacity: 0.8 }}>
              Rename it below to import as a new profile, or leave it to overwrite the existing one:
            </p>
            <input
              type="text"
              autoFocus={true}
              value={overrideName}
              onChange={(e) => setOverrideName(e.target.value)}
              style={{
                width: "95%",
                padding: "8px",
                fontSize: "16px",
                border: "1px solid #ccc",
                borderRadius: "var(--btn-radius, 4px)"
              }}
            />
            {isOverwriting && (
              <p style={{ margin: "8px 0 0 0", fontSize: "0.85em", color: "#d9534f" }}>
                ⚠️ Warning: This will overwrite the existing "{overrideName.trim()}" profile.
              </p>
            )}

            {/* Show metadata in the warning screen too! */}
            {renderMetadata(pendingOverwrite)}

          </div>
        ) : (
          <>
            <p style={{ margin: "0 0 8px 0", fontSize: "0.9em", opacity: 0.8 }}>
              Paste your profile export string below:
            </p>
            <textarea
              value={importString}
              onChange={(e) => {
                setImportString(e.target.value);
                if (error) setError(null);
              }}
              rows={5}
              placeholder="Paste string here..."
              style={{ width: "98%", height: "120px", resize: "vertical", fontFamily: "monospace", borderRadius: "var(--btn-radius, 4px)" }}
            />

            {/* LIVE PREVIEW: Shows up instantly when a valid string is pasted */}
            {parsedPreview && renderMetadata(parsedPreview)}

            {error && <div className="profile-warning" style={{ color: "#d9534f", marginTop: "8px" }}>{error}</div>}
          </>
        )}
      </div>

      <div className="profile-button-area">
        {pendingOverwrite ? (
          <>
            <button
              className="import-button"
              style={{ backgroundColor: isOverwriting ? "#d9534f" : "var(--color-import)" }}
              disabled={!overrideName.trim()}
              onClick={confirmImport}
            >
              {isOverwriting ? "Overwrite" : "Import as New"}
            </button>
            <button
              className="import-button"
              style={{ backgroundColor: "#444e5b" }}
              onClick={() => setPendingOverwrite(null)}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="import-button"
              onClick={handleImportClick}
            >
              Import
            </button>
            <button
              className="import-button"
              style={{ backgroundColor: "#444e5b" }}
              onClick={() => setShow(false)}
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileImportBox;
