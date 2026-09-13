export const USAGE_EVENT_SCHEMA_VERSION = 1 as const;

export type Game = "poe" | "poe2";
export type ProfileAction = "selected" | "created" | "renamed" | "deleted" | "imported";
export type FavoriteType = "favorite" | "static" | "group";
export type FavoriteAgeBucket = "same_day" | "1_7_days" | "older";
export type ProfileImportFailureReason = "empty_input" | "wrong_game" | "invalid_format";

export interface ProfileUsageEvent {
  event: "profile";
  action: ProfileAction;
  profileName: string;
  previousProfileName?: string;
  profileCount?: number;
}

export interface FavoriteCreatedUsageEvent {
  event: "favorite_created";
  favoriteType: FavoriteType;
  profileName: string;
  favoriteCount: number;
  page?: string;
  operator?: "and" | "or";
  memberCount?: number;
}

export interface FavoriteDeletedUsageEvent {
  event: "favorite_deleted";
  favoriteType: FavoriteType;
  profileName: string;
  favoriteCount: number;
  ageBucket: FavoriteAgeBucket;
  page?: string;
}

export interface ProfileExportedUsageEvent {
  event: "profile_exported";
  profileName: string;
}

export interface ProfileImportFailedUsageEvent {
  event: "profile_import_failed";
  reason: ProfileImportFailureReason;
}

export interface TradeClickedUsageEvent {
  event: "trade_clicked";
  profileName: string;
  page: string;
}

export interface LanguageSelectedUsageEvent {
  event: "language_selected";
  profileName: string;
  language: string;
  previousLanguage: string;
}

export type UsageEvent = ProfileUsageEvent | FavoriteCreatedUsageEvent | FavoriteDeletedUsageEvent
  | ProfileExportedUsageEvent | ProfileImportFailedUsageEvent | TradeClickedUsageEvent | LanguageSelectedUsageEvent;

export type UsageEventEnvelope = UsageEvent & {
  schemaVersion: typeof USAGE_EVENT_SCHEMA_VERSION;
  anonymousId: string;
  game: Game;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const boundedString = (value: unknown, maximumLength: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  return result && result.length <= maximumLength ? result : undefined;
};

const optionalBoundedString = (value: unknown, maximumLength: number): string | undefined | null => {
  if (value === undefined) return undefined;
  return boundedString(value, maximumLength) ?? null;
};

const boundedInteger = (value: unknown, minimum: number, maximum: number): number | undefined =>
  Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum ? value as number : undefined;

const isOneOf = <T extends string>(value: unknown, values: readonly T[]): value is T =>
  typeof value === "string" && values.includes(value as T);

const ANONYMOUS_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Parses untrusted tracking input into an exact, size-bounded shape. Unknown
 * properties are deliberately discarded so callers cannot inject log fields.
 */
export const parseUsageEventEnvelope = (value: unknown): UsageEventEnvelope | undefined => {
  if (!isObject(value) || value.schemaVersion !== USAGE_EVENT_SCHEMA_VERSION) return undefined;
  if (!isOneOf(value.game, ["poe", "poe2"])) return undefined;
  if (typeof value.anonymousId !== "string" || !ANONYMOUS_ID.test(value.anonymousId)) return undefined;

  const base = {
    schemaVersion: USAGE_EVENT_SCHEMA_VERSION,
    anonymousId: value.anonymousId.toLowerCase(),
    game: value.game,
  };
  if (value.event === "profile") {
    const profileName = boundedString(value.profileName, 80);
    if (!profileName) return undefined;
    if (!isOneOf(value.action, ["selected", "created", "renamed", "deleted", "imported"])) return undefined;
    const previousProfileName = optionalBoundedString(value.previousProfileName, 80);
    if (previousProfileName === null || (value.action === "renamed" && !previousProfileName)) return undefined;
    const mutation = value.action !== "selected";
    const profileCount = boundedInteger(value.profileCount, 0, 1000);
    if ((mutation && profileCount === undefined) || (!mutation && value.profileCount !== undefined)) return undefined;
    return {
      ...base,
      event: "profile",
      action: value.action,
      profileName,
      ...(previousProfileName ? {previousProfileName} : {}),
      ...(profileCount !== undefined ? {profileCount} : {}),
    };
  }

  if (value.event === "favorite_created" || value.event === "favorite_deleted") {
    const profileName = boundedString(value.profileName, 80);
    if (!isOneOf(value.favoriteType, ["favorite", "static", "group"])) return undefined;
    const favoriteCount = boundedInteger(value.favoriteCount, 0, 10000);
    const page = optionalBoundedString(value.page, 40);
    if (!profileName || favoriteCount === undefined || page === null) return undefined;
    if ((value.favoriteType === "favorite") !== Boolean(page)) return undefined;

    if (value.event === "favorite_deleted") {
      if (!isOneOf(value.ageBucket, ["same_day", "1_7_days", "older"])) return undefined;
      return {...base, event: "favorite_deleted", favoriteType: value.favoriteType, profileName, favoriteCount, ageBucket: value.ageBucket, ...(page ? {page} : {})};
    }

    if (value.favoriteType === "group") {
      if (!isOneOf(value.operator, ["and", "or"])) return undefined;
      if (!Number.isInteger(value.memberCount) || (value.memberCount as number) < 2 || (value.memberCount as number) > 100) return undefined;
      return {...base, event: "favorite_created", favoriteType: "group", profileName, favoriteCount, operator: value.operator, memberCount: value.memberCount as number};
    }
    if (value.operator !== undefined || value.memberCount !== undefined) return undefined;
    return {
      ...base,
      event: "favorite_created",
      favoriteType: value.favoriteType,
      profileName,
      favoriteCount,
      ...(page ? {page} : {}),
    };
  }

  if (value.event === "profile_exported") {
    const profileName = boundedString(value.profileName, 80);
    if (!profileName) return undefined;
    return {...base, event: "profile_exported", profileName};
  }

  if (value.event === "profile_import_failed") {
    if (!isOneOf(value.reason, ["empty_input", "wrong_game", "invalid_format"])) return undefined;
    return {...base, event: "profile_import_failed", reason: value.reason};
  }

  if (value.event === "trade_clicked") {
    const profileName = boundedString(value.profileName, 80);
    const page = boundedString(value.page, 40);
    if (!profileName || !page) return undefined;
    return {...base, event: "trade_clicked", profileName, page};
  }

  if (value.event === "language_selected") {
    const profileName = boundedString(value.profileName, 80);
    const language = boundedString(value.language, 40);
    const previousLanguage = boundedString(value.previousLanguage, 40);
    if (!profileName || !language || !previousLanguage) return undefined;
    return {...base, event: "language_selected", profileName, language, previousLanguage};
  }

  return undefined;
};

export const favoriteAgeBucket = (createdAt: string, now = Date.now()): FavoriteAgeBucket => {
  const age = Math.max(0, now - Date.parse(createdAt));
  if (age < 24 * 60 * 60 * 1000) return "same_day";
  if (age < 7 * 24 * 60 * 60 * 1000) return "1_7_days";
  return "older";
};
