import React from "react";
import {Link} from "react-router-dom";
import FilterCard from "@shared/components/FilterCard/FilterCard";

// The shares made in this browser. The profile itself is not kept: the share page fetches it by the id.
interface SharedProfile {
  id: string;
  name: string;
  createdAt: string;
}

const STORAGE_KEY = "sharedProfiles";

export const loadSharedProfiles = (): SharedProfile[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((share) => typeof share?.id === "string") : [];
  } catch {
    return [];
  }
};

/** Puts the share first in the list. Sharing the same profile again answers the same id, which is kept once. */
export const saveSharedProfile = (id: string, name: string): void => {
  const others = loadSharedProfiles().filter((share) => share.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([{id, name, createdAt: new Date().toISOString()}, ...others]));
};

export default function SharedProfiles() {
  const shares = loadSharedProfiles();
  if (shares.length === 0) return null;
  return (
    <div style={{padding: "0 14px 40px"}}>
      <FilterCard title="Shared profiles">
        <ul>
          {shares.map(({id, name, createdAt}) => <li key={id} style={{overflowWrap: "anywhere"}}>
            <Link to={`/share/${id}`} style={{color: "var(--color-text-link)"}}>{String(name)}</Link> · shared {String(createdAt).slice(0, 10)}
          </li>)}
        </ul>
      </FilterCard>
    </div>
  );
}
