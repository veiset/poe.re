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
  const [pendingRegex, setPendingRegex] = useState<RegexImportCandidate<T>>();
  const [name, setName] = useState("");
  const [regexCandidates, setRegexCandidates] = useState<RegexImportCandidate<T>[]>([]);
  const [selectedPageKey, setSelectedPageKey] = useState<string>();
  const [regexResolved, setRegexResolved] = useState(!parseRegex);
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
      setRegexResolved(true);
      return;
    }
    setRegexResolved(false);
    parseRegex(importString).then((candidates) => {
      if (!active) return;
      setRegexCandidates(candidates);
      setSelectedPageKey((prev) =>
        candidates.some((c) => c.pageKey === prev) ? prev : candidates[0]?.pageKey
      );
      setRegexResolved(true);
    }).catch(() => {
      if (!active) return;
      setRegexCandidates([]);
      setSelectedPageKey(undefined);
      setRegexResolved(true);
    });
    return () => { active = false; };
  }, [importString, parseRegex, preview, detectedGame]);

  const selectedRegexCandidate = useMemo(
    () => regexCandidates.find((c) => c.pageKey === selectedPageKey) ?? regexCandidates[0],
    [regexCandidates, selectedPageKey],
  );

  const invalidMessage = `Invalid or corrupted ${profileType} import string${parseRegex ? " or regex" : ""}.`;
  const liveUnmatchedWarning = Boolean(
    importString.trim() && !preview && !detectedGame && regexResolved && !selectedRegexCandidate && !error,
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
        if (existingProfiles.includes(candidate.settings.name)) {
          setPendingRegex(candidate);
          setName(candidate.settings.name);
        } else {
          onImportRegex(candidate);
        }
        return;
      }
    }
    setError(importString.trim()
      ? invalidMessage
      : `Please paste an export string${parseRegex ? " or regex" : ""}.`);
  };

  const confirm = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (pending) {
      onImport({...pending, name: trimmedName});
    } else if (pendingRegex && onImportRegex) {
      onImportRegex({...pendingRegex, settings: {...pendingRegex.settings, name: trimmedName}});
    }
  };
  const activePendingName = pending?.name ?? pendingRegex?.settings.name;
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
        {activePendingName !== undefined ? <>
          <p>Profile "{activePendingName}" already exists. Rename it, or leave the name unchanged to overwrite it:</p>
          <input autoFocus type="text" value={name} onChange={(event) => setName(event.target.value)} />
          {overwriting && <div className="profile-warning">This will overwrite "{name.trim()}".</div>}
          {pending && renderMetadata(pending)}
          {pendingRegex && renderRegexMetadata(pendingRegex)}
        </> : <>
          <p>Paste your {profileType} export string{parseRegex ? " or regex" : ""} below:</p>
          <textarea value={importString} rows={5} placeholder={parseRegex ? "Paste profile export string or regex here..." : "Paste string here..."}
                    style={{width: "98%", height: "120px", resize: "vertical", fontFamily: "monospace"}}
                    onChange={(event) => { setImportString(event.target.value); setError(undefined); }} />
          {(preview || detectedGame) && renderMetadata(preview)}
          {!preview && !detectedGame && selectedRegexCandidate && renderRegexMetadata(selectedRegexCandidate)}
          {(error || liveUnmatchedWarning) && <div className="profile-warning">{error ?? invalidMessage}</div>}
        </>}
      </div>
      <div className="profile-button-area">
        {activePendingName !== undefined ? <>
          <button className="import-button" disabled={!name.trim()} onClick={confirm}>
            {overwriting ? "Overwrite" : "Import as New"}
          </button>
          <button className="import-button" style={{backgroundColor: "#444e5b"}}
                  onClick={() => { setPending(undefined); setPendingRegex(undefined); }}>Cancel</button>
        </> : <>
          <button className="import-button" onClick={beginImport}>Import</button>
          <button className="import-button" style={{backgroundColor: "#444e5b"}}
                  onClick={() => setShow(false)}>Close</button>
        </>}
      </div>
    </div>
  );
}
