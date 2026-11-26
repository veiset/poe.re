// Shares as GET /api/share/<id> answers them. The dev server's mock API (shared/mockShareApi.ts) serves them,
// and tests and browser checks use them, so that every run sees the same shares.
// Only this type import here: the Vite config loads this file.
import type {ShareAnswer} from "../../../../shared/components/share/ShareAnswer";

export const shareFixtures = [
  {
    id: "mockT17map", game: "poe", source: "poe.re", author: "veiset",
    description: "T17 juicing, 8-mod maps.\nAvoids reflect, no regen and the worst boss mods.",
    createdAt: "2026-11-20T18:02:11.000Z", imports: 148,
    profile: {
      name: "T17 juicing", version: 2, language: "FRENCH",
      map: {badIds: [246480838, -2064669900, -1818595967], goodIds: [-1629200695], quantity: "80", packsize: "35"},
      tattoo: {minValue: "5"},
    },
  },
  // No author or description
  {
    id: "mockLeague", game: "poe", source: "poe.re",
    createdAt: "2026-11-25T07:40:00.000Z", imports: 3,
    profile: {name: "league start", version: 2, language: "ENGLISH", vendor: {anyThreeLink: true, colors: {rgb: true}}},
  },
  // From before profiles had a version, so it is migrated when it is opened. Long texts, from another tool.
  {
    id: "mockOldVer", game: "poe", source: "some-discord-bot", author: "a_very_long_author_name_32_chars",
    description: "An old share, saved before profiles had a version.",
    createdAt: "2026-08-01T12:00:00.000Z", imports: 12,
    profile: {name: "old maps with a rather long profile name to see how it wraps", map: {badIds: [246480838, -2064669900]}},
  },
] as const satisfies readonly ShareAnswer[];

/** An id that no share has: the API answers 404, as for a share that was removed. */
export const removedShareId = "mockRemove";
