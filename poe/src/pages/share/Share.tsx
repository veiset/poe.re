import React, {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import "@shared/components/profile/Profile.css";
import "./Share.css";
import {profileContents} from "@poe/components/profile/ShareDialog";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {readProfile} from "@poe/components/profile/ProfileTransfer";
import {migrateProfile} from "@poe/migration/migrations";
import {availableProfileName} from "@poe/pages/import/PobCodesImport";
import {setSelectedProfile, updateSettings} from "@poe/utils/LocalStorage";
import type {SavedSettings} from "@poe/utils/SavedSettings";

dayjs.extend(relativeTime);

interface SharedProfile {
  profile: SavedSettings;
  // What the profile holds, e.g. Map mods: "4 mods, quantity 80"
  contents: {key: string, label: string, info: string[]}[];
  // Anyone can send these, so they are only ever shown as text
  author?: string;
  description?: string;
  createdAt?: string;
}

// Where Import goes: the first of these pages that the profile has settings for, or else Favorites
const landingPages = [
  ["map", "/maps"], ["itemCrafting", "/items"], ["beast", "/beast"], ["tattoo", "/tattoo"], ["ultimatum", "/ultimatum"],
  ["runegraft", "/runegraft"], ["heist", "/heist"], ["gems", "/gems"], ["vendor", "/vendor"],
];

const text = (value: unknown): string | undefined => typeof value === "string" && value ? value : undefined;

/** Fetches a share and brings its profile up to date. Answers the message to show when it can't be opened. */
export async function loadShare(id: string): Promise<SharedProfile | string> {
  let share;
  try {
    const response = await fetch(`/api/share/${encodeURIComponent(id)}`);
    if (response.status === 404) return "This share doesn't exist or was removed.";
    if (response.status === 429) return "Too many requests. Wait a minute and open the link again.";
    if (!response.ok) return "Could not load the share. Try again later.";
    share = await response.json();
  } catch {
    return "Could not load the share. Try again later.";
  }
  if (share?.game !== "poe") return "This share is not a poe.re profile.";
  try {
    const shared = readProfile(share.profile);
    // If the migration fails, the profile is saved on its old version and migrated on the next visit
    const profile = await migrateProfile(shared).catch(() => shared);
    return {
      profile, contents: profileContents(profile), author: text(share.author), description: text(share.description), createdAt: text(share.createdAt),
    };
  } catch {
    return "This share's profile is not valid.";
  }
}

export default function Share() {
  const {id = ""} = useParams();
  const [share, setShare] = useState<SharedProfile | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    loadShare(id).then(result => {
      if (!active) return;
      if (typeof result === "string") setError(result);
      else setShare(result);
    });
    return () => { active = false; };
  }, [id]);

  function openProfile() {
    if (!share || saving) return;
    setSaving(true);
    try {
      const name = availableProfileName(share.profile.name);
      updateSettings(name, () => ({...share.profile, name}));
      setSelectedProfile(name);
      const landing = landingPages.find(([key]) => share.contents.some((section) => section.key === key));
      // The page must mount with the new profile before its autosave effects run.
      window.location.replace(landing?.[1] ?? "/favorites");
    } catch {
      setError("Could not save the profile. Check that browser storage is available and try again.");
      setSaving(false);
    }
  }

  const shared = share?.createdAt && dayjs(share.createdAt).isValid() ? dayjs(share.createdAt).fromNow() : "";

  return (
    <div className="full-size share-page">
      <div className="share-heading">
        <h1>Shared profile</h1>
        {share && <button className="share-import" disabled={saving} onClick={openProfile}>Import profile</button>}
      </div>
      <FilterCard title="Profile">
        {error && <p role="alert">{error}</p>}
        {!share && !error && <p role="status">Loading the shared profile...</p>}
        {share && <div className="share-preview">
          <h2>{availableProfileName(share.profile.name)}</h2>
          <p className="share-meta">{[share.author && `by ${share.author}`, shared].filter(Boolean).join(", ")}</p>
          {share.description && <>
            <h3>Description</h3>
            <p className="share-description">{share.description}</p>
          </>}
          <h3>Categories</h3>
          <table>
            <tbody>
              {share.contents.map(({label, info}) => <tr key={label}><th scope="row">{label}</th><td>{info.map((part) => <span key={part}>{part}</span>)}</td></tr>)}
            </tbody>
          </table>
        </div>}
      </FilterCard>
    </div>
  );
}
