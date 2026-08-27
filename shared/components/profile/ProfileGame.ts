export type ProfileGame = "poe" | "poe2";

export const profileGameLabel = (game: ProfileGame): string => game === "poe" ? "PoE" : "PoE2";

export const decodeProfilePayload = (value: string): unknown => {
  const json = decodeURIComponent(escape(atob(value.trim())));
  return JSON.parse(json);
};

export const detectProfileGame = (value: string): ProfileGame | undefined => {
  try {
    const parsed = decodeProfilePayload(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const payload = parsed as Record<string, unknown>;
    if (payload.game === "poe" || payload.game === "poe2") return payload.game;

    // PoE1 exports created before game metadata used the settings object directly
    // (including an empty object for an unchanged default profile). PoE2 has always
    // used an envelope, so any unwrapped object is a legacy PoE candidate.
    if (!("settings" in payload)) return "poe";
  } catch {
    return undefined;
  }
  return undefined;
};
