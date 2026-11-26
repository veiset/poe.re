import React, {useState} from "react";
import "@shared/components/favorites/FavoriteDialog.css";
import {createProfileDelta} from "@shared/components/profile/ProfileDelta";
import {defaultSettings, SavedSettings} from "../../utils/SavedSettings";
import {exportSettings} from "./ProfileTransfer";
import {saveSharedProfile} from "../../pages/share/SharedProfiles";

type SectionKey = keyof Omit<SavedSettings, "name" | "language" | "version">;

interface Section {
  key: SectionKey;
  label: string;
  // What the section holds, e.g. "4 mods". Without it, the number of changed settings is shown.
  info?: (settings: SavedSettings) => (string | false)[];
}

const count = (n: number, noun: string) => n > 0 && `${n} ${noun}${n === 1 ? "" : "s"}`;

// The pages of the site. Settings of removed pages (boat, expedition, scarab, flask, item) are not shared.
const sections: Section[] = [
  {key: "favorites", label: "Favorites", info: ({favorites}) => [count(favorites.length, "favorite")]},
  {key: "vendor", label: "Vendor"},
  {key: "gems", label: "Gems", info: ({gems}) => [count(gems.selected.length, "gem")]},
  {key: "map", label: "Map mods", info: ({map}) => [
    count(map.goodIds.length + map.badIds.length, "mod"),
    map.quantity && `quantity ${map.quantity}`,
    map.packsize && `pack size ${map.packsize}`,
  ]},
  {key: "itemCrafting", label: "Items", info: ({itemCrafting}) => [
    count(Object.keys(itemCrafting.selectedRareMods).length + itemCrafting.selectedMagicMods.length, "mod"),
  ]},
  {key: "heist", label: "Heist"},
  {key: "beast", label: "Bestiary"},
  {key: "tattoo", label: "Tattoo"},
  {key: "runegraft", label: "Runegraft"},
  {key: "ultimatum", label: "Ultimatum", info: ({ultimatum}) => [
    count(ultimatum.avoidModifiers.length, "avoided modifier"),
    count(ultimatum.rewards.length, "reward"),
    count(ultimatum.sacrifices.length, "sacrifice"),
  ]},
];

const changedSettings = (delta: unknown): number =>
  delta && typeof delta === "object" && !Array.isArray(delta)
    ? Object.values(delta).reduce<number>((sum, value) => sum + changedSettings(value), 0)
    : 1;

// Undefined for a section that is as the defaults, which has nothing to share
const sectionInfo = (section: Section, settings: SavedSettings): string[] | undefined => {
  const delta = createProfileDelta(settings[section.key], defaultSettings[section.key]);
  if (delta === undefined) return undefined;
  const info = (section.info?.(settings) ?? []).filter((part) => part !== false && part !== "");
  return info.length > 0 ? info as string[] : [count(changedSettings(delta), "setting") + " changed"];
};

/** The sections of a profile that differ from the defaults, with what each holds. */
export const profileContents = (settings: SavedSettings): {key: string, label: string, info: string[]}[] =>
  sections.flatMap((section) => {
    const info = sectionInfo(section, settings);
    return info === undefined ? [] : [{key: section.key, label: section.label, info}];
  });

interface ShareDialogProps {
  settings: SavedSettings;
  onClose: () => void;
}

export default function ShareDialog({settings, onClose}: ShareDialogProps) {
  const [name, setName] = useState(settings.name);
  // The author of the last share made in this browser
  const [author, setAuthor] = useState(() => localStorage.getItem("shareAuthor") ?? "");
  const [description, setDescription] = useState("");
  const [excluded, setExcluded] = useState<SectionKey[]>([]);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  const changed = sections.filter((section) => sectionInfo(section, settings) !== undefined);
  const unchanged = sections.filter((section) => !changed.includes(section));

  const share = async (event: React.FormEvent) => {
    event.preventDefault();
    setSharing(true);
    setError("");
    const shared: SavedSettings = {...defaultSettings, name: name.trim(), language: settings.language, version: settings.version};
    sections.filter(({key}) => !excluded.includes(key))
      .forEach(({key}) => { (shared as unknown as Record<string, unknown>)[key] = settings[key]; });
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          profile: exportSettings(shared), source: "poe.re",
          ...(author.trim() && {author: author.trim()}),
          ...(description.trim() && {description: description.trim()}),
        }),
      });
      const answer = await response.json().catch(() => ({}));
      if (response.ok && typeof answer.id === "string") {
        setLink(`${window.location.origin}/share/${answer.id}`);
        saveSharedProfile(answer.id, shared.name);
        localStorage.setItem("shareAuthor", author.trim());
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
            {section.label} <span className="favorite-dialog-help">({sectionInfo(section, settings)?.join(", ")})</span>
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
