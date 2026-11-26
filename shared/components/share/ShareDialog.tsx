import React, {useState} from "react";
import "@shared/components/favorites/FavoriteDialog.css";
import {sectionInfo} from "./ShareConfig";
import type {ShareConfig} from "./ShareConfig";
import {saveSharedProfile} from "./SharedProfiles";

interface ShareDialogProps<Settings extends {name: string}> {
  config: ShareConfig<Settings>;
  settings: Settings;
  onClose: () => void;
}

/** Shares the parts of a profile that the user ticks, and shows the link to the share. */
export default function ShareDialog<Settings extends {name: string}>({config, settings, onClose}: ShareDialogProps<Settings>) {
  const {sections} = config;
  const authorKey = `${config.storagePrefix}shareAuthor`;
  const [name, setName] = useState(settings.name);
  // The author of the last share made in this browser
  const [author, setAuthor] = useState(() => localStorage.getItem(authorKey) ?? "");
  const [description, setDescription] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  const changed = sections.filter((section) => sectionInfo(config, section, settings) !== undefined);
  const unchanged = sections.filter((section) => !changed.includes(section));

  const share = async (event: React.FormEvent) => {
    event.preventDefault();
    setSharing(true);
    setError("");
    // The defaults, with the ticked sections and what every share has
    const shared: Settings = {...config.defaultSettings, name: name.trim()};
    [...config.keep, ...sections.map(({key}) => key).filter((key) => !excluded.includes(key))]
      .forEach((key) => { shared[key] = settings[key]; });
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          profile: config.exportSettings(shared), source: config.site,
          ...(author.trim() && {author: author.trim()}),
          ...(description.trim() && {description: description.trim()}),
        }),
      });
      const answer = await response.json().catch(() => ({}));
      if (response.ok && typeof answer.id === "string") {
        setLink(`${window.location.origin}/share/${answer.id}`);
        saveSharedProfile(config.storagePrefix, answer.id, shared.name);
        localStorage.setItem(authorKey, author.trim());
      } else setError(typeof answer.error === "string" ? answer.error : "Could not share the profile. Try again later.");
    } catch {
      setError("Could not share the profile. Try again later.");
    }
    setSharing(false);
  };

  const copy = () => navigator.clipboard.writeText(link).then(() => setCopied(true));

  return <div className="favorite-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="favorite-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" onSubmit={share}>
      <h2 id="share-dialog-title">Share profile</h2>
      {link ? <>
        <label className="favorite-dialog-field">Anyone with this link can open a copy of the profile
          <input readOnly value={link} onClick={(event) => event.currentTarget.select()}/>
        </label>
        <div className="favorite-dialog-actions">
          <button type="button" onClick={onClose}>Close</button>
          <button type="button" onClick={() => window.open(link, "_blank", "noopener")}>
            Open <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: "-1px", marginLeft: 4}}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>
            </svg>
          </button>
          <button className="favorite-dialog-save" type="button" onClick={copy}>{copied ? "Copied✓" : "Copy link"}</button>
        </div>
      </> : <>
        <label className="favorite-dialog-field">Profile name
          <input value={name} maxLength={50} onChange={(event) => setName(event.target.value)} required/>
        </label>
        <label className="favorite-dialog-field">Author
          <input value={author} maxLength={32} onChange={(event) => setAuthor(event.target.value)}/>
        </label>
        <label className="favorite-dialog-field">Description
          <textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)}/>
        </label>
        <div className="favorite-dialog-field">Share
          {changed.map((section) => <label key={section.key} style={{color: "var(--color-text)", cursor: "pointer"}}>
            <input type="checkbox" style={{width: "auto", marginRight: 8}} checked={!excluded.includes(section.key)}
                   onChange={() => setExcluded(excluded.includes(section.key)
                     ? excluded.filter((key) => key !== section.key) : [...excluded, section.key])}/>
            {section.label} <span className="favorite-dialog-help">({sectionInfo(config, section, settings)?.join(", ")})</span>
          </label>)}
          {unchanged.length > 0 && <span className="favorite-dialog-help">
            No changes / nothing to share:<br/>{unchanged.map(({label}) => label).join(", ")}
          </span>}
        </div>
        <div className="favorite-dialog-error" role="alert">{error}</div>
        <div className="favorite-dialog-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="favorite-dialog-save" type="submit" disabled={!name.trim() || sharing || changed.every(({key}) => excluded.includes(key))}>{sharing ? "Sharing…" : "Share"}</button>
        </div>
      </>}
    </form>
  </div>;
}
