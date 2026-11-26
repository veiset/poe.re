import {createProfileDelta} from "@shared/components/profile/ProfileDelta";

/** A part of a profile that can be shared by itself, usually the settings of one page. */
export interface ShareSection<Settings> {
  key: keyof Settings & string;
  label: string;
  // What the section holds, e.g. "4 mods". Without it, the number of changed settings is shown.
  info?: (settings: Settings) => (string | false)[];
}

/** What the share dialog, the share page and the list of shared profiles need to know about an app. */
export interface ShareConfig<Settings extends {name: string}> {
  // The `game` of the app's shares in the share API, e.g. "poe"
  game: string;
  // The app's site, e.g. "poe.re". It is the `source` of the shares made here.
  site: string;
  // Before the app's localStorage keys, e.g. "poe2."
  storagePrefix: string;
  defaultSettings: Settings;
  sections: ShareSection<Settings>[];
  // The settings outside the sections that every share has, e.g. the language
  keep: (keyof Settings)[];
  // Where importing a share goes: the first of these [section key, route] that the profile has settings for
  landingPages: [string, string][];
  // ...or else here
  fallbackPage: string;
  /** The settings that differ from the defaults, as the share API stores them. */
  exportSettings: (settings: Settings) => object;
  /** Fills a share's settings in from the defaults. Throws when they are not a profile. */
  readProfile: (settings: unknown) => Settings;
  migrateProfile: (profile: Settings) => Promise<Settings>;
  profileNames: () => string[];
  /** Saves the profile under its name, and selects it. */
  saveProfile: (profile: Settings) => void;
}

/** "3 mods", "1 mod", or false for none. */
export const count = (n: number, noun: string) => n > 0 && `${n} ${noun}${n === 1 ? "" : "s"}`;

const changedSettings = (delta: unknown): number =>
  delta && typeof delta === "object" && !Array.isArray(delta)
    ? Object.values(delta).reduce<number>((sum, value) => sum + changedSettings(value), 0)
    : 1;

/** What a section holds. Undefined for a section that is as the defaults, which has nothing to share. */
export const sectionInfo = <Settings extends {name: string}>(
  config: ShareConfig<Settings>, section: ShareSection<Settings>, settings: Settings,
): string[] | undefined => {
  const delta = createProfileDelta(settings[section.key], config.defaultSettings[section.key]);
  if (delta === undefined) return undefined;
  const info = (section.info?.(settings) ?? []).filter((part) => part !== false && part !== "");
  return info.length > 0 ? info as string[] : [count(changedSettings(delta), "setting") + " changed"];
};

/** The sections of a profile that differ from the defaults, with what each holds. */
export const profileContents = <Settings extends {name: string}>(
  config: ShareConfig<Settings>, settings: Settings,
): {key: string, label: string, info: string[]}[] =>
  config.sections.flatMap((section) => {
    const info = sectionInfo(config, section, settings);
    return info === undefined ? [] : [{key: section.key, label: section.label, info}];
  });
