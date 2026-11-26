import React from "react";
import {Link} from "react-router-dom";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "./Share.css";

dayjs.extend(relativeTime);

// The shares made in this browser. The profile itself is not kept: the share page fetches it by the id.
interface SharedProfile {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
}

// "3 days ago"
const sharedAgo = (createdAt: unknown): string =>
  typeof createdAt === "string" && dayjs(createdAt).isValid() ? dayjs(createdAt).fromNow() : "";

// With the app's prefix for its localStorage keys, e.g. "poe2."
const storageKey = (storagePrefix: string) => `${storagePrefix}sharedProfiles`;

export const loadSharedProfiles = (storagePrefix: string): SharedProfile[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(storagePrefix)) ?? "[]");
    return Array.isArray(stored) ? stored.filter((share) => typeof share?.id === "string" && /^[A-Za-z0-9_-]+$/.test(share.id)) : [];
  } catch {
    return [];
  }
};

/** Puts the share first in the list. Sharing the same profile again answers the same id, which is kept once. */
export const saveSharedProfile = (storagePrefix: string, id: string, name: string, description: string): void => {
  const others = loadSharedProfiles(storagePrefix).filter((share) => share.id !== id);
  localStorage.setItem(storageKey(storagePrefix), JSON.stringify([
    {id, name, createdAt: new Date().toISOString(), ...(description && {description})}, ...others,
  ]));
};

export default function SharedProfiles({storagePrefix}: {storagePrefix: string}) {
  const shares = loadSharedProfiles(storagePrefix);
  if (shares.length === 0) return null;
  return (
    <div className="shared-profiles">
      <FilterCard title="Shared profiles">
        <ul>
          {shares.map(({id, name, createdAt, description}) => <li key={id}>
            <Link to={`/share/${id}`}>{String(name)}</Link>
            <span>{[sharedAgo(createdAt), typeof description === "string" && description].filter(Boolean).join(", ")}</span>
          </li>)}
        </ul>
      </FilterCard>
    </div>
  );
}
