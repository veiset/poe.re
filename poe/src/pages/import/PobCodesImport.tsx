import React, {useContext, useEffect, useState} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import "@shared/components/profile/Profile.css";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {loadMapMods} from "@poe/utils/loadData";
import {loadProfileNames, setSelectedProfile, updateSettings} from "@poe/utils/LocalStorage";
import {defaultSettings} from "@poe/utils/SavedSettings";
import type {MapModsRegex} from "@poe/types/generated/mapmods";

export function readExclusions(search: string): number[] | null {
  const params = new URLSearchParams(search);
  const data = params.get("data") ?? "";
  if (data.length > 8192) return null;
  try {
    const payload = JSON.parse(data);
    if (!payload || Object.keys(payload).length !== 1 || !Array.isArray(payload.excludeIds) ||
        payload.excludeIds.length === 0 ||
        !payload.excludeIds.every(Number.isSafeInteger)) return null;
    return [...new Set<number>(payload.excludeIds)];
  } catch {
    return null;
  }
}

export default function PobCodesImport() {
  const {lang} = useContext(ProfileContext);
  const {search} = useLocation();
  const navigate = useNavigate();
  const [query] = useState(search);
  const [mods, setMods] = useState<MapModsRegex["tokens"] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Capture once and remove the payload from this history entry, including in Strict Mode.
    navigate("/import-pob-codes", {replace: true});
    const ids = readExclusions(query);
    if (!ids) {
      setError("Invalid PoB Codes import link. Open a new link from pob.codes.");
      return;
    }
    let active = true;
    loadMapMods(lang).then(catalog => {
      if (!active) return;
      const selected = catalog.tokens.filter(mod => ids.includes(mod.id));
      if (selected.length === ids.length) setMods(selected);
      else setError("This link contains unknown map modifiers. Open a new link from pob.codes.");
    }, () => {
      if (active) setError("Could not load map modifiers. Open the link again from pob.codes.");
    });
    return () => { active = false; };
  }, [lang, navigate, query]);

  function importProfile() {
    if (!mods || saving) return;
    setSaving(true);
    try {
      const names = loadProfileNames();
      let name = "PoB Codes";
      let suffix = 2;
      while (names.includes(name)) name = `PoB Codes (${suffix++})`;
      updateSettings(name, () => ({
        ...defaultSettings, name, language: lang,
        map: {...defaultSettings.map, badIds: mods.map(mod => mod.id)},
      }));
      setSelectedProfile(name);
      // The map page must mount with the new profile before its autosave effects run.
      window.location.replace("/maps");
    } catch {
      setError("Could not save the profile. Check that browser storage is available and try again.");
      setSaving(false);
    }
  }

  return (
    <div className="full-size">
      <h1>Import from PoB Codes</h1>
      <FilterCard title="Map exclusions">
        {error && <p role="alert">{error}</p>}
        {!mods && !error && <p role="status">Loading map modifiers...</p>}
        {mods && <>
          <p>Create a new profile excluding these {mods.length} map modifiers.
            You can rename it on the Maps page.</p>
          <ul>{mods.map(mod => <li key={mod.id}>{mod.rawText.replaceAll("|", " · ")}</li>)}</ul>
        </>}
        <div>
          {mods && <button className="import-button" disabled={saving} onClick={importProfile}>Import</button>}
          <Link className="import-button" style={{backgroundColor: "#444e5b"}} to="/maps" replace>Cancel</Link>
        </div>
      </FilterCard>
    </div>
  );
}
