import React, {ReactNode, useEffect, useMemo, useState} from "react";
import {NamedProfile} from "./ProfileExportBox";
import {detectProfileGame, ProfileGame, profileGameLabel} from "./ProfileGame";
import type {RegexImportCandidate} from "@shared/core/regex/ParseRegex";

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
  parseRegex?: (value: string) => Promise<RegexImportCandidate<T>[]>;
  onImportRegex?: (candidate: RegexImportCandidate<T>) => void;
}

export default function ProfileImportBox<T extends NamedProfile>({
  existingProfiles, setShow, onImport, decode, expectedGame, profileType = "profile", metadata,
  parseRegex, onImportRegex,
}: ProfileImportBoxProps<T>) {
  const [importString, setImportString] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<T>();
  const [name, setName] = useState("");
  const [regexCandidates, setRegexCandidates] = useState<RegexImportCandidate<T>[]>([]);
  const [selectedPageKey, setSelectedPageKey] = useState<string>();
  const preview = useMemo(() => {
    if (!importString.trim()) return undefined;
    try { return decode(importString); } catch { return undefined; }
  }, [decode, importString]);
  const detectedGame = useMemo(() => detectProfileGame(importString), [importString]);
  const displayedGame = detectedGame ?? (preview ? expectedGame : undefined);
  const gameMismatch = detectedGame !== undefined && detectedGame !== expectedGame;

  useEffect(() => {
    let active = true;
    if (!parseRegex || !importString.trim() || preview || detectedGame) {
      setRegexCandidates([]);
      setSelectedPageKey(undefined);
      return;
    }
    parseRegex(importString).then((candidates) => {
      if (!active) return;
      setRegexCandidates(candidates);
      setSelectedPageKey((prev) =>
        candidates.some((c) => c.pageKey === prev) ? prev : candidates[0]?.pageKey
      );
    }).catch(() => {
      if (!active) return;
      setRegexCandidates([]);
      setSelectedPageKey(undefined);
    });
    return () => { active = false; };
  }, [importString, parseRegex, preview, detectedGame]);

  const selectedRegexCandidate = useMemo(
    () => regexCandidates.find((c) => c.pageKey === selectedPageKey) ?? regexCandidates[0],
    [regexCandidates, selectedPageKey],
  );

  const beginImport = async () => {
    setError(undefined);
    if (gameMismatch) {
      setError(`This ${profileGameLabel(detectedGame)} profile cannot be imported into ${profileGameLabel(expectedGame)}.`);
      return;
    }
    if (preview) {
      if (existingProfiles.includes(preview.name)) {
        setPending(preview);
        setName(preview.name);
      } else {
        onImport(preview);
      }
      return;
    }
    if (parseRegex && onImportRegex && importString.trim()) {
      const candidate = selectedRegexCandidate ?? (await parseRegex(importString).catch(() => []))[0];
      if (candidate) {
        onImportRegex(candidate);
        return;
      }
    }
    setError(importString.trim()
      ? `Invalid or corrupted ${profileType} import string${parseRegex ? " or regex" : ""}.`
      : `Please paste an export string${parseRegex ? " or regex" : ""}.`);
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

  const renderRegexMetadata = (candidate: RegexImportCandidate<T>) => (
    <div className="profile-metadata">
      <div className="profile-metadata-title">Detected Regex:</div>
      <div className="profile-metadata-grid">
        <span>Target page:</span>
        {regexCandidates.length > 1 ? (
          <select
            aria-label="Target page"
            className="dropdown-select dropdown-sm"
            value={candidate.pageKey}
            onChange={(event) => setSelectedPageKey(event.target.value)}
          >
            {regexCandidates.map((item) => (
              <option className="option-league" key={item.pageKey} value={item.pageKey}>
                {item.pageLabel}
              </option>
            ))}
          </select>
        ) : (
          <strong>{candidate.pageLabel}</strong>
        )}
        {candidate.metadata.map(({label, value}) => <React.Fragment key={label}>
          <span>{label}:</span><strong>{value}</strong>
        </React.Fragment>)}
      </div>
    </div>
  );

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
          <p>Paste your {profileType} export string{parseRegex ? " or regex" : ""} below:</p>
          <textarea value={importString} rows={5} placeholder={parseRegex ? "Paste profile export string or regex here..." : "Paste string here..."}
                    style={{width: "98%", height: "120px", resize: "vertical", fontFamily: "monospace"}}
                    onChange={(event) => { setImportString(event.target.value); setError(undefined); }} />
          {(preview || detectedGame) && renderMetadata(preview)}
          {!preview && !detectedGame && selectedRegexCandidate && renderRegexMetadata(selectedRegexCandidate)}
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
