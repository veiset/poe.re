import React, {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import "./Share.css";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {availableProfileName} from "@shared/components/profile/availableProfileName";
import {profileContents} from "./ShareConfig";
import type {ShareConfig} from "./ShareConfig";

dayjs.extend(relativeTime);

interface SharedProfile<Settings> {
  profile: Settings;
  // What the profile holds, e.g. Map mods: "4 mods, quantity 80"
  contents: {key: string, label: string, info: string[]}[];
  // Anyone can send these, so they are only ever shown as text
  author?: string;
  description?: string;
  createdAt?: string;
}

const text = (value: unknown): string | undefined => typeof value === "string" && value ? value : undefined;

/** Fetches a share and brings its profile up to date. Answers the message to show when it can't be opened. */
export async function loadShare<Settings extends {name: string}>(
  config: ShareConfig<Settings>, id: string,
): Promise<SharedProfile<Settings> | string> {
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
  if (share?.game !== config.game) return `This share is not a ${config.site} profile.`;
  try {
    const shared = config.readProfile(share.profile);
    // If the migration fails, the profile is saved on its old version and migrated on the next visit
    const profile = await config.migrateProfile(shared).catch(() => shared);
    return {
      profile, contents: profileContents(config, profile), author: text(share.author), description: text(share.description), createdAt: text(share.createdAt),
    };
  } catch {
    return "This share's profile is not valid.";
  }
}

/** The page a shared link opens: it previews the share, and imports it as a new profile. */
export default function SharePage<Settings extends {name: string}>({config}: {config: ShareConfig<Settings>}) {
  const {id = ""} = useParams();
  const [share, setShare] = useState<SharedProfile<Settings> | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    loadShare(config, id).then(result => {
      if (!active) return;
      if (typeof result === "string") setError(result);
      else setShare(result);
    });
    return () => { active = false; };
  }, [config, id]);

  function openProfile() {
    if (!share || saving) return;
    setSaving(true);
    try {
      config.saveProfile({...share.profile, name: availableProfileName(share.profile.name, config.profileNames())});
      const landing = config.landingPages.find(([key]) => share.contents.some((section) => section.key === key));
      // The page must mount with the new profile before its autosave effects run.
      window.location.replace(landing?.[1] ?? config.fallbackPage);
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
          <h2>{availableProfileName(share.profile.name, config.profileNames())}</h2>
          <p className="share-meta">{[share.author && `by ${share.author}`, shared].filter(Boolean).join(", ")}</p>
          {share.description && <>
            <h3>Description</h3>
            <p className="share-description">{share.description}</p>
          </>}
          <h3>Categories</h3>
          <ul className="share-categories">
            {share.contents.map(({label, info}) => <li key={label}>
              <strong>{label}</strong>{info.map((part) => <span key={part}>{part}</span>)}
            </li>)}
          </ul>
        </div>}
      </FilterCard>
      <p className="share-api-docs">
        API docs: <a href="https://poe.re/api" target="_blank" rel="noopener noreferrer">https://poe.re/api</a>
      </p>
    </div>
  );
}
