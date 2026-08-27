import React, {ReactNode, useMemo, useState} from "react";
import {NamedProfile} from "./ProfileExportBox";
import {detectProfileGame, ProfileGame, profileGameLabel} from "./ProfileGame";

export interface ProfileMetadata {
  label: string;
  value: ReactNode;
}

export interface ProfileImportBoxProps<T extends NamedProfile> {
  existingProfiles: string[];
  setShow: (show: boolean) => void;
  onImport: (settings: T) => void;
  decode: (value: string) => T;
  profileType?: string;
  metadata?: (profile: T) => ProfileMetadata[];
  expectedGame: ProfileGame;
}

export default function ProfileImportBox<T extends NamedProfile>({
  existingProfiles, setShow, onImport, decode, expectedGame, profileType = "profile", metadata,
}: ProfileImportBoxProps<T>) {
  const [importString, setImportString] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<T>();
  const [name, setName] = useState("");
  const preview = useMemo(() => {
    if (!importString.trim()) return undefined;
    try { return decode(importString); } catch { return undefined; }
  }, [decode, importString]);
  const detectedGame = useMemo(() => detectProfileGame(importString), [importString]);
  const displayedGame = detectedGame ?? (preview ? expectedGame : undefined);
  const gameMismatch = detectedGame !== undefined && detectedGame !== expectedGame;

  const beginImport = () => {
    setError(undefined);
    if (gameMismatch) {
      setError(`This ${profileGameLabel(detectedGame)} profile cannot be imported into ${profileGameLabel(expectedGame)}.`);
      return;
    }
    if (!preview) {
      setError(importString.trim()
        ? `Invalid or corrupted ${profileType} import string.`
        : "Please paste an export string.");
      return;
    }
    if (existingProfiles.includes(preview.name)) {
      setPending(preview);
      setName(preview.name);
    } else {
      onImport(preview);
    }
  };

  const confirm = () => {
    if (pending && name.trim()) onImport({...pending, name: name.trim()});
  };
  const overwriting = existingProfiles.includes(name.trim());
  const renderMetadata = (profile?: T) => {
    const profileRows = profile ? (metadata?.(profile) ?? [{label: "Name", value: profile.name}]) : [];
    const rows = displayedGame
      ? [{label: "Game", value: profileGameLabel(displayedGame)}, ...profileRows]
      : profileRows;
    return (
      <div className="profile-metadata">
        <div className="profile-metadata-title">Profile Metadata:</div>
        <div className="profile-metadata-grid">
          {rows.map(({label, value}) => <React.Fragment key={label}>
            <span>{label}:</span><strong>{value}</strong>
          </React.Fragment>)}
        </div>
        {gameMismatch && <div className="profile-game-warning">
          This profile is for {profileGameLabel(detectedGame)} and cannot be imported into {profileGameLabel(expectedGame)}.
        </div>}
      </div>
    );
  };

  return (
    <div className="new-profile-box export-profile-box">
      <div className="profile-header">⍗ Import Profile</div>
      <div className="profile-input-area">
        {pending ? <>
          <p>Profile "{pending.name}" already exists. Rename it, or leave the name unchanged to overwrite it:</p>
          <input autoFocus type="text" value={name} onChange={(event) => setName(event.target.value)} />
          {overwriting && <div className="profile-warning">This will overwrite "{name.trim()}".</div>}
          {renderMetadata(pending)}
        </> : <>
          <p>Paste your {profileType} export string below:</p>
          <textarea value={importString} rows={5} placeholder="Paste string here..."
                    style={{width: "98%", height: "120px", resize: "vertical", fontFamily: "monospace"}}
                    onChange={(event) => { setImportString(event.target.value); setError(undefined); }} />
          {(preview || detectedGame) && renderMetadata(preview)}
          {error && <div className="profile-warning">{error}</div>}
        </>}
      </div>
      <div className="profile-button-area">
        {pending ? <>
          <button className="import-button" disabled={!name.trim()} onClick={confirm}>
            {overwriting ? "Overwrite" : "Import as New"}
          </button>
          <button className="import-button" style={{backgroundColor: "#444e5b"}}
                  onClick={() => setPending(undefined)}>Cancel</button>
        </> : <>
          <button className="import-button" onClick={beginImport}>Import</button>
          <button className="import-button" style={{backgroundColor: "#444e5b"}}
                  onClick={() => setShow(false)}>Close</button>
        </>}
      </div>
    </div>
  );
}
