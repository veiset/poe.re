import React, {useEffect, useState} from "react";
import {Link, useParams} from "react-router-dom";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import "@shared/components/profile/Profile.css";
import {readProfile} from "@poe/components/profile/ProfileTransfer";
import {migrateProfile} from "@poe/migration/migrations";
import {availableProfileName} from "@poe/pages/import/PobCodesImport";
import {setSelectedProfile, updateSettings} from "@poe/utils/LocalStorage";
import type {SavedSettings} from "@poe/utils/SavedSettings";

interface SharedProfile {
  profile: SavedSettings;
  mapMods: number;
  // Anyone can send these, so they are only ever shown as text
  author?: string;
  description?: string;
  source?: string;
  createdAt?: string;
}

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
    const mapMods = profile.map.goodIds.length + profile.map.badIds.length;
    if (!Number.isInteger(mapMods)) return "This share's profile is not valid.";
    return {
      profile, mapMods, author: text(share.author), description: text(share.description),
      source: text(share.source), createdAt: text(share.createdAt),
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
      // The page must mount with the new profile before its autosave effects run.
      window.location.replace("/maps");
    } catch {
      setError("Could not save the profile. Check that browser storage is available and try again.");
      setSaving(false);
    }
  }

  const rows = share ? [
    ["Name", availableProfileName(share.profile.name)],
    ["Author", share.author],
    ["Description", share.description],
    ["Source", share.source],
    ["Shared", share.createdAt?.slice(0, 10)],
    ["Language", share.profile.language],
    ["Selected map mods", share.mapMods],
    ["Favorites", share.profile.favorites.length],
  ] as const : [];

  return (
    <div className="full-size">
      <h1>Shared profile</h1>
      <FilterCard title="Profile">
        {error && <p role="alert">{error}</p>}
        {!share && !error && <p role="status">Loading the shared profile...</p>}
        {share && <>
          <div className="profile-metadata-grid" style={{overflowWrap: "anywhere", whiteSpace: "pre-wrap"}}>
            {rows.filter(([, value]) => value !== undefined).map(([label, value]) => <React.Fragment key={label}>
              <span>{label}:</span><strong>{value}</strong>
            </React.Fragment>)}
          </div>
          <p>Open saves it as a new profile and selects it. Your other profiles are not changed.</p>
        </>}
        <div>
          {share && <button className="import-button" disabled={saving} onClick={openProfile}>Open</button>}
          <Link className="import-button" style={{backgroundColor: "#444e5b"}} to="/maps" replace>Cancel</Link>
        </div>
      </FilterCard>
    </div>
  );
}
