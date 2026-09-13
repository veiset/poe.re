import {FavoriteAgeBucket, ProfileAction, ProfileImportFailureReason, UsageEvent} from "@shared/core/tracking/UsageEvent";
import {UsageTrackingService} from "@shared/core/tracking/UsageTrackingService";
import {Poe1FavoritePageKey} from "@poe/core/favorites/FavoriteTypes";
import {RepoeLanguageKey} from "@poe/utils/Languages";

type Poe1UsageEvent = UsageEvent & {page?: Poe1FavoritePageKey; language?: RepoeLanguageKey};

class Poe1UsageTrackingService extends UsageTrackingService<Poe1UsageEvent> {
  constructor() { super("poe"); }

  profile(action: "selected", profileName: string): void;
  profile(action: Exclude<ProfileAction, "selected">, profileName: string, profileCount: number, previousProfileName?: string): void;
  profile(action: ProfileAction, profileName: string, profileCount?: number, previousProfileName?: string): void {
    this.track({event: "profile", action, profileName, ...(profileCount !== undefined ? {profileCount} : {}), ...(previousProfileName ? {previousProfileName} : {})});
  }

  favorite(profileName: string, favoriteCount: number, page: Poe1FavoritePageKey): void {
    this.track({event: "favorite_created", favoriteType: "favorite", profileName, favoriteCount, page});
  }

  staticFavorite(profileName: string, favoriteCount: number): void {
    this.track({event: "favorite_created", favoriteType: "static", profileName, favoriteCount});
  }

  favoriteGroup(profileName: string, favoriteCount: number, operator: "and" | "or", memberCount: number): void {
    this.track({event: "favorite_created", favoriteType: "group", profileName, favoriteCount, operator, memberCount});
  }

  favoriteDeleted(profileName: string, favoriteCount: number, favoriteType: "favorite" | "static" | "group", ageBucket: FavoriteAgeBucket, page?: Poe1FavoritePageKey): void {
    this.track({event: "favorite_deleted", profileName, favoriteCount, favoriteType, ageBucket, ...(page ? {page} : {})});
  }

  profileExported(profileName: string): void { this.track({event: "profile_exported", profileName}); }
  profileImportFailed(reason: ProfileImportFailureReason): void { this.track({event: "profile_import_failed", reason}); }
  tradeClicked(profileName: string, page: Poe1FavoritePageKey): void { this.track({event: "trade_clicked", profileName, page}); }

  language(profileName: string, language: RepoeLanguageKey, previousLanguage: RepoeLanguageKey): void {
    this.track({event: "language_selected", profileName, language, previousLanguage});
  }
}

export const poe1UsageTracking = new Poe1UsageTrackingService();
