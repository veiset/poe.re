export interface FavoriteMetadata {
  name: string;
  description: string;
  color: string;
  tags: string[];
}

export const FAVORITE_COLORS = ["#c6930a", "#5fa8d6", "#69b578", "#d67575", "#a986d6", "#d68cb8"] as const;
export const DEFAULT_FAVORITE_COLOR = FAVORITE_COLORS[0];
export const MAX_FAVORITE_TAGS = 10;
export const MAX_FAVORITE_TAG_LENGTH = 24;
export const MAX_FAVORITE_GROUP_REGEX_LENGTH = 250;

export type FavoriteGroupOperator = "and" | "or";
export interface FavoriteGroupCandidate {
  kind: "favorite" | "static";
  id: string;
  name: string;
  regex: string;
  tags: string[];
  updatedAt: string;
}

export interface FavoriteGroupDefinition {
  kind: "group";
  id: string;
  name: string;
  memberIds: string[];
  operator: FavoriteGroupOperator;
  tags: string[];
  updatedAt: string;
}
export type FavoriteResolvableEntry = FavoriteGroupCandidate | FavoriteGroupDefinition;
export type FavoriteGroupIssue = "missing-members" | "too-long" | "incompatible" | "empty";
export interface FavoriteGroupResolution {
  members: FavoriteGroupCandidate[];
  missingIds: string[];
  operator: FavoriteGroupOperator;
  regexLength: number;
  issue?: FavoriteGroupIssue;
}

export const favoriteGroupIssueText = (group: FavoriteGroupResolution): string | undefined => {
  if (group.issue === "missing-members") {
    return `This group references ${group.missingIds.length} missing favorite${group.missingIds.length === 1 ? "" : "s"}. Edit the group before copying.`;
  }
  if (group.issue === "too-long") {
    return `The referenced favorites exceed the ${MAX_FAVORITE_GROUP_REGEX_LENGTH}-character limit. Edit the group before copying.`;
  }
  if (group.issue === "incompatible") {
    return `The referenced favorites cannot be combined with ${group.operator.toUpperCase()}. Edit the group before copying.`;
  }
  if (group.issue === "empty") return "This group needs at least two available favorites.";
  return undefined;
};

export type ResolvedFavoriteGroup<T extends FavoriteResolvableEntry> =
  | Exclude<T, {kind: "group"}>
  | (Extract<T, {kind: "group"}> & {
    regex: string;
    groupResolution: FavoriteGroupResolution;
  });

export const favoriteGroupRegexLength = (favorites: readonly FavoriteGroupCandidate[]): number =>
  favorites.reduce((length, favorite) => length + favorite.regex.length, 0);

const singleSearchTerm = (regex: string): string | undefined => {
  const trimmed = regex.trim();
  const quoted = trimmed.match(/^"((?:\\.|[^"\\])*)"$/);
  if (quoted) return quoted[1];

  // Generators such as poe/item may emit a single raw regex token when it needs no quoting.
  if (!/\s/.test(trimmed) && !trimmed.includes('"')) return trimmed;
  return undefined;
};

const andSearchExpression = (regex: string): string => {
  const trimmed = regex.trim();
  const term = singleSearchTerm(trimmed);
  return term !== undefined && !trimmed.startsWith('"') ? `"${term}"` : trimmed;
};

export const favoriteGroupRegex = (favorites: readonly FavoriteGroupCandidate[]): string =>
  favorites.map((favorite) => andSearchExpression(favorite.regex)).join(" ");

export const favoriteOrIncompatibility = (favorite: FavoriteGroupCandidate): string | undefined => {
  const term = singleSearchTerm(favorite.regex);
  if (term === undefined) return "This favorite contains multiple search terms.";
  if (term.startsWith("!")) return "Negative search terms cannot be safely combined with OR.";
  return undefined;
};

/** OR is safe for one positive search term per favorite, whether quoted or a whitespace-free raw regex. */
export const canGroupFavorites = (favorites: readonly FavoriteGroupCandidate[], operator: FavoriteGroupOperator): boolean =>
  favorites.length >= 2
  && favorites.every((favorite) => favorite.regex.trim())
  && (operator === "and" || favorites.every((favorite) => !favoriteOrIncompatibility(favorite)));

export const selectValidFavoriteGroupMembers = <T extends FavoriteGroupCandidate>(
  favorites: readonly T[],
  memberIds: readonly string[],
  operator: FavoriteGroupOperator,
): T[] => {
  const byId = new Map(favorites.map((favorite) => [favorite.id, favorite]));
  const members = memberIds.flatMap((id) => {
    const favorite = byId.get(id);
    return favorite ? [favorite] : [];
  });
  const hasMissingOrDuplicateMembers = members.length !== new Set(memberIds).size;
  if (hasMissingOrDuplicateMembers
    || favoriteGroupRegexLength(members) > MAX_FAVORITE_GROUP_REGEX_LENGTH
    || !canGroupFavorites(members, operator)) {
    throw new Error("Those favorites cannot be grouped with this operator.");
  }
  return members;
};

export const composeFavoriteGroupRegex = (favorites: readonly FavoriteGroupCandidate[], operator: FavoriteGroupOperator): string =>
  operator === "and" ? favoriteGroupRegex(favorites) : `"${favorites.map((favorite) => singleSearchTerm(favorite.regex)!).join("|")}"`;

export const resolveFavoriteGroups = <T extends FavoriteResolvableEntry>(favorites: readonly T[]): ResolvedFavoriteGroup<T>[] => {
  const byId = new Map(favorites.map((favorite) => [favorite.id, favorite]));
  return favorites.map((favorite) => {
    if (favorite.kind !== "group") return favorite as ResolvedFavoriteGroup<T>;
    const missingIds: string[] = [];
    const members: FavoriteGroupCandidate[] = favorite.memberIds.flatMap((id) => {
      const member = byId.get(id);
      if (member && member.kind !== "group") return [member as FavoriteGroupCandidate];
      missingIds.push(id);
      return [];
    });
    const operator = favorite.operator;
    const regexLength = favoriteGroupRegexLength(members);
    const issue: FavoriteGroupIssue | undefined = missingIds.length
      ? "missing-members"
      : members.length < 2
        ? "empty"
        : regexLength > MAX_FAVORITE_GROUP_REGEX_LENGTH
          ? "too-long"
          : !canGroupFavorites(members, operator)
            ? "incompatible"
            : undefined;
    const inheritedTags = normalizeFavoriteTags([...favorite.tags, ...members.flatMap((member) => member.tags ?? [])]);
    const memberUpdates = members.map((member) => member.updatedAt).filter((value): value is string => Boolean(value));
    const latestUpdate = [favorite.updatedAt, ...memberUpdates].sort().at(-1) ?? favorite.updatedAt;
    return {
      ...favorite,
      regex: issue ? "" : composeFavoriteGroupRegex(members, operator),
      tags: inheritedTags,
      updatedAt: latestUpdate,
      groupResolution: {members, missingIds, operator, regexLength, issue},
    } as ResolvedFavoriteGroup<T>;
  });
};

export const normalizeFavoriteTags = (tags: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of tags) {
    const tag = value.trim().slice(0, MAX_FAVORITE_TAG_LENGTH);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length === MAX_FAVORITE_TAGS) break;
  }
  return result;
};

export const sanitizeFavoriteColor = (value: unknown): string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_FAVORITE_COLOR;

export const cloneFavoriteConfiguration = <T,>(value: T): T =>
  typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T;

export const createFavoriteId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `favorite-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
