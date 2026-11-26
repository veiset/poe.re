// Shares as GET /api/share/<id> answers them. The dev server's mock API (shared/mockShareApi.ts) serves them,
// and tests and browser checks use them, so that every run sees the same shares.
// Only this type import here: the Vite config loads this file.
import type {ShareAnswer} from "../../../../shared/components/share/ShareAnswer";

export const shareFixtures = [
  {
    id: "mockWaysto", game: "poe2", source: "poe2.re", author: "veiset",
    description: "T15 waystones for mapping.\nCorrupted, with some item rarity.",
    createdAt: "2026-11-21T10:15:00.000Z", imports: 61,
    profile: {
      name: "T15 waystones", version: 2, language: "ENGLISH",
      waystone: {tier: {min: 15}, state: {corrupted: true}, itemRarity: "50"},
      tablet: {rarity: {rare: true}, type: {breach: true, ritual: true}},
    },
  },
  // No author or description
  {
    id: "mockTablet", game: "poe2", source: "poe2.re",
    createdAt: "2026-11-25T07:40:00.000Z", imports: 2,
    profile: {name: "breach tablets", version: 2, language: "FRENCH", tablet: {type: {breach: true}}},
  },
] as const satisfies readonly ShareAnswer[];

/** An id that no share has: the API answers 404, as for a share that was removed. */
export const removedShareId = "mockRemove";
