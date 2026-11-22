const defaultEconomyUrl = "https://economy.poe.re";

const economyBaseUrl = (import.meta.env.VITE_ECONOMY_URL ?? defaultEconomyUrl)
  .replace(/\/$/, "");

export type EconomyCategory = "expedition" | "beast" | "tattoo" | "runegraft" | "scarab" | "divination";

/** Returns the public, CDN-backed URL for a periodically refreshed economy file. */
export function economyUrl(path: string): string {
  return `${economyBaseUrl}/${path.replace(/^\//, "")}`;
}

/** Returns the R2 URL for a league-specific economy file written by economy-fetcher. */
export function economyFileUrl(
  category: EconomyCategory,
  league: string,
  type: string,
): string {
  return economyUrl(`${category}/eco_${league}_${type}.json`);
}

/** Fetches and parses a league-specific economy file. */
export async function fetchEconomyFile<T>(
  category: EconomyCategory,
  league: string,
  type: string,
): Promise<T> {
  const response = await fetch(economyFileUrl(category, league, type));
  if (!response.ok) {
    throw new Error(`Could not fetch economy data: ${response.status}`);
  }
  return response.json() as Promise<T>;
}
