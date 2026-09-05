import {ScarabSettings} from "@poe/utils/SavedSettings";
import type {Scarabs} from "@poe/types/generated/scarabs";

export function generateScarabRegex(settings: ScarabSettings, scarabs: Scarabs): string {
  const regex = settings.selected.map((scarab) => {
    return scarabs[scarab]?.regex;
  }).filter((regex): regex is string => regex !== undefined).join("|");
  return (regex.length > 0) ? `"${regex}"` : "";
}
