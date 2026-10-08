import {groupAffixes} from "@shared/core/item/GroupUtils";
import {rebaseItemSettings} from "@shared/core/item/RebaseItemSettings";
import {generateMagicItemRegex, generateRareItemRegex} from "@shared/core/item/ItemOutput";
import type {ItemCraftingSettings} from "@shared/types/Settings.types";
import {merge} from "@shared/core/utils";
import {RepoeLanguage} from "@poe/utils/Languages";
import type {RepoeLanguageKey} from "@poe/utils/Languages";
import {defaultSettings} from "./settings";
import type {Poe2RegexFavoriteRecord, SelectOption} from "./settings";
import {loadItemBasetypes, loadItemRegex, loadRelicRegex, loadTabletAffixes, loadWaystoneAffixes} from "./utils/loadData";
import {generateRelicResult} from "./pages/relic/RelicResult";
import {generateTabletRegex} from "./pages/tablet/TabletResult";
import {generateWaystoneRegex} from "./pages/waystone/WaystoneResult";

type AffixOption = {id: number; name: string; regex: string; ranges: number[][]; sourceIndex?: number};

const appendCustomText = (regex: string, text: string, enabled: boolean): string =>
  text && enabled ? `${regex} ${text}`.trim() : regex;

const mapOptions = (options: SelectOption[], from: AffixOption[], to: AffixOption[]): SelectOption[] =>
  options.map((option) => {
    const source = from.find((affix) => option.id !== undefined
      ? affix.id === option.id
      : affix.name === option.name || affix.regex === option.regex);
    const target = source && to.find((affix) => affix.sourceIndex === source.sourceIndex);
    return target ? {...option, id: target.id, name: target.name, regex: target.regex, ranges: target.ranges} : option;
  });

export const rebaseWaystoneSettings = (
  settings: typeof defaultSettings.waystone,
  source: AffixOption[],
  target: AffixOption[],
): typeof defaultSettings.waystone => ({...settings, modifier: {
  ...settings.modifier,
  wantedMods: mapOptions(settings.modifier.wantedMods, source, target),
  unwantedMods: mapOptions(settings.modifier.unwantedMods, source, target),
}});

export const rebaseTabletSettings = (
  settings: typeof defaultSettings.tablet,
  source: AffixOption[],
  target: AffixOption[],
): typeof defaultSettings.tablet => ({...settings, modifier: {
  ...settings.modifier,
  affixes: mapOptions(settings.modifier.affixes, source, target),
}});

export const rebaseRelicSettings = (
  settings: typeof defaultSettings.relic,
  source: Awaited<ReturnType<typeof loadRelicRegex>>,
  target: Awaited<ReturnType<typeof loadRelicRegex>>,
): typeof defaultSettings.relic => {
  const mapRelicOptions = (options: SelectOption[]): SelectOption[] => options.map((option) => {
    const index = source.findIndex((affix) => affix.name === option.name || affix.regex === option.regex);
    const affix = target[index];
    return affix ? {...option, name: affix.name, regex: affix.regex, ranges: affix.ranges} : option;
  });
  return {...settings, modifier: {
    prefixes: mapRelicOptions(settings.modifier.prefixes),
    suffixes: mapRelicOptions(settings.modifier.suffixes),
  }};
};

export async function renderPoe2Favorite(favorite: Poe2RegexFavoriteRecord, language: RepoeLanguageKey): Promise<string> {
  if (!favorite.languageDependent) return favorite.regex;
  const storedLanguage = favorite.context.language;
  const sourceLanguage = storedLanguage && Object.prototype.hasOwnProperty.call(RepoeLanguage, storedLanguage)
    ? storedLanguage as RepoeLanguageKey
    : "ENGLISH";
  if (sourceLanguage === language) return favorite.regex;

  if (favorite.pageKey === "waystone") {
    const [source, target] = await Promise.all([loadWaystoneAffixes(sourceLanguage), loadWaystoneAffixes(language)]);
    const settings = merge(defaultSettings.waystone, favorite.configuration as Partial<typeof defaultSettings.waystone>);
    const waystone = rebaseWaystoneSettings(settings, source, target);
    const customText = waystone.resultSettings.customText;
    const generated = generateWaystoneRegex({...defaultSettings, waystone: {
      ...waystone, resultSettings: {...waystone.resultSettings, customText: ""},
    }});
    return appendCustomText(generated, customText, waystone.resultSettings.customTextEnabled);
  }
  if (favorite.pageKey === "tablet") {
    const [source, target] = await Promise.all([loadTabletAffixes(sourceLanguage), loadTabletAffixes(language)]);
    const settings = merge(defaultSettings.tablet, favorite.configuration as Partial<typeof defaultSettings.tablet>);
    const tablet = rebaseTabletSettings(settings, source, target);
    const customText = tablet.resultSettings.customText;
    const generated = generateTabletRegex({...defaultSettings, tablet: {
      ...tablet, resultSettings: {...tablet.resultSettings, customText: ""},
    }});
    return appendCustomText(generated, customText, tablet.resultSettings.customTextEnabled);
  }
  if (favorite.pageKey === "relic") {
    const [source, target] = await Promise.all([loadRelicRegex(sourceLanguage), loadRelicRegex(language)]);
    const settings = merge(defaultSettings.relic, favorite.configuration as Partial<typeof defaultSettings.relic>);
    const relic = rebaseRelicSettings(settings, source, target);
    const generated = generateRelicResult({...defaultSettings, relic: {
      ...relic, resultSettings: {...relic.resultSettings, customText: ""},
    }});
    return appendCustomText(generated, relic.resultSettings.customText, relic.resultSettings.customTextEnabled);
  }
  if (favorite.pageKey === "item") {
    const [sourceBases, targetBases, sourceRegex, targetRegex] = await Promise.all([
      loadItemBasetypes(sourceLanguage), loadItemBasetypes(language), loadItemRegex(sourceLanguage), loadItemRegex(language),
    ]);
    const settings = merge(defaultSettings.itemCrafting, favorite.configuration as Partial<ItemCraftingSettings>);
    const rebased = rebaseItemSettings(settings, sourceBases, targetBases, sourceRegex, targetRegex);
    const itembase = rebased.settings.itembase;
    const regex = !itembase ? "" : itembase.rarity === "Rare"
      ? generateRareItemRegex(groupAffixes(targetRegex), rebased.settings)
      : generateMagicItemRegex(rebased.settings, rebased.basetypes);
    return appendCustomText(regex, rebased.settings.customText.value, rebased.settings.customText.enabled);
  }
  return favorite.regex;
}
