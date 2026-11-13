import type {Language} from "@shared/typedefs/Language";

export type GGPKLanguageData = {
  readonly urlKey: string;
  readonly short: string;
  readonly name: string;
  readonly flag: string;
};

export const GGPKLanguage = {
  ENGLISH: { urlKey: "", short: "en", name: "English", flag: "🇺🇸" },
  FRENCH: { urlKey: "French", short: "fr", name: "French", flag: "🇫🇷" },
  GERMAN: { urlKey: "German", short: "de", name: "German", flag: "🇩🇪" },
  JAPANESE: { urlKey: "Japanese", short: "ja", name: "Japanese", flag: "🇯🇵" },
  KOREAN: { urlKey: "Korean", short: "ko", name: "Korean", flag: "🇰🇷" },
  PORTUGUESE: {
    urlKey: "Portuguese",
    short: "pt",
    name: "Portuguese",
    flag: "🇵🇹",
  },
  RUSSIAN: { urlKey: "Russian", short: "ru", name: "Russian", flag: "🇷🇺" },
  SPANISH: { urlKey: "Spanish", short: "es", name: "Spanish", flag: "🇪🇸" },
  THAI: { urlKey: "Thai", short: "th", name: "Thai", flag: "🇹🇭" },
  CHINESE: {
    urlKey: "Traditional%20Chinese",
    short: "zh",
    name: "Chinese",
    flag: "🇨🇳",
  },
} as const satisfies Record<Language, GGPKLanguageData>;

/** A language read from saved data, such as a favorite or a profile, or English when it isn't one the site has. */
export const storedLanguage = (language: unknown): Language =>
  typeof language === "string" && Object.prototype.hasOwnProperty.call(GGPKLanguage, language) ? language as Language : "ENGLISH";

export const TRANSLATION_NEED = "TRANSLATION_NEEDED";

export const MapStaticStatRegex: Record<
  Language,
  {
    quantity: string;
    packsize: string;
    mapdrop: string;
    itemrarity: string;
    currency: string;
    scarab: string;
    divination: string;
    quality_regular: string;
    quality_currency: string;
    quality_divination: string;
    quality_rarity: string;
    quality_packsize: string;
    quality_scarab: string;
    rarity_prefix: string;
    rarity_normal: string;
    rarity_magic: string;
    rarity_rare: string;
    corrupted: string;
    unidentified: string;
  }
> = {
  ENGLISH: {
    quantity: "as d.*",
    packsize: "r pa.*",
    mapdrop: "re maps.*",
    itemrarity: "m rar.*",
    currency: "cy:.*",
    scarab: "e thr.*",
    divination: "e div.*",
    quality_regular: "ty \\(Quantity\\):.*",
    quality_currency: "\\(Curr.*",
    quality_divination: "\\(div.*",
    quality_rarity: "\\(rar.*",
    quality_packsize: "ze\\).*",
    quality_scarab: "\\(th.*",
    rarity_prefix: "y: ",
    rarity_normal: "n",
    rarity_magic: "m",
    rarity_rare: "r",
    corrupted: "pte",
    unidentified: "tified",
  },
  FRENCH: {
    quantity: "tin d.*",
    packsize: "pes d.*",
    mapdrop: "tes:.*",
    itemrarity: "s ob.*",
    currency: "e d'o.*",
    scarab: "e fils.*",
    divination: "e cartes d.*",
    quality_regular: "\\(qu.*",
    quality_currency: "\\(ob.*",
    quality_divination: "\\(car.*",
    quality_rarity: "\\(ra.*",
    quality_packsize: "\\(tai.*",
    quality_scarab: "\\(fil.*",
    rarity_prefix: "é: ",
    rarity_normal: "n",
    rarity_magic: "m",
    rarity_rare: "r",
    corrupted: "ompu",
    unidentified: "on id",
  },
  GERMAN: {
    quantity: "ute.*",
    packsize: "rgr.*",
    mapdrop: "r Ka.*",
    itemrarity: "ssel.*",
    currency: "r Wä.*",
    scarab: "r Fä.*",
    divination: "r We.*",
    quality_regular: "ge\\).*",
    quality_currency: "ng\\).*",
    quality_divination: "\\(We.*",
    quality_rarity: "it\\).*",
    quality_packsize: "ße\\).*",
    quality_scarab: "\\(Fä.*",
    rarity_prefix: "t: ",
    rarity_normal: "N",
    rarity_magic: "M",
    rarity_rare: "S",
    corrupted: "rbt",
    unidentified: "ntif",
  },
  JAPANESE: {
    quantity: "スド.*",
    packsize: "ーパ.*",
    mapdrop: "プ量.*",
    itemrarity: "ムレア.*",
    currency: "ー量.*",
    scarab: "ド量.*",
    divination: "ド増.*",
    quality_regular: "量\\).*",
    quality_currency: "ー\\).*",
    quality_divination: "\\(占.*",
    quality_rarity: "ィ\\).*",
    quality_packsize: "ズ\\).*",
    quality_scarab: "\\(ス.*",
    rarity_prefix: "ィ: ",
    rarity_normal: "ノ",
    rarity_magic: "マ",
    rarity_rare: "レ",
    corrupted: "コラ",
    unidentified: "未鑑",
  },
  KOREAN: {
    quantity: "득물.*",
    packsize: "터 무.*",
    mapdrop: "도 더.*",
    itemrarity: "템 희.*",
    currency: "폐 더.*",
    scarab: "낱 더.*",
    divination: "증폭.*",
    quality_regular: "량\\).*",
    quality_currency: "폐\\).*",
    quality_divination: "드\\).*",
    quality_rarity: "도\\).*",
    quality_packsize: "모\\).*",
    quality_scarab: "낱\\).*",
    rarity_prefix: "도: ",
    rarity_normal: "일",
    rarity_magic: "마",
    rarity_rare: "희",
    corrupted: "타락",
    unidentified: "미확",
  },
  PORTUGUESE: {
    quantity: "ns d.*",
    packsize: "o G.*",
    mapdrop: "s Ma.*",
    itemrarity: "ridade d.*",
    currency: "ios.*",
    scarab: "s S.*",
    divination: "is C.*",
    quality_regular: "\\(Qu.*",
    quality_currency: "as\\).*",
    quality_divination: "ão\\).*",
    quality_rarity: "\\(Ra.*",
    quality_packsize: "e G.*",
    quality_scarab: "\\(Se.*",
    rarity_prefix: "e: ",
    rarity_normal: "N",
    rarity_magic: "M",
    rarity_rare: "R",
    corrupted: "mpid",
    unidentified: "ntif",
  },
  RUSSIAN: {
    quantity: "ды в.*",
    packsize: "пп м.*",
    mapdrop: "ьше карт.*",
    itemrarity: "сть п.*",
    currency: "юты:.*",
    scarab: "е нит.*",
    divination: "гадальных.*",
    quality_regular: "во\\):.*",
    quality_currency: "люта\\).*",
    quality_divination: "карты\\).*",
    quality_rarity: "сть\\).*",
    quality_packsize: "ппы\\).*",
    quality_scarab: "нити\\).*",
    rarity_prefix: "ь: ",
    rarity_normal: "о",
    rarity_magic: "в",
    rarity_rare: "р",
    corrupted: "рне",
    unidentified: "неоп",
  },
  SPANISH: {
    quantity: "n del A.*",
    packsize: "s gr.*",
    mapdrop: "pas.*",
    itemrarity: "za d.*",
    currency: "s o.*",
    scarab: "s hi.*",
    divination: "s ca.*",
    quality_regular: "ad\\).*",
    quality_currency: "\\(ob.*",
    quality_divination: "ón\\).*",
    quality_rarity: "za\\).*",
    quality_packsize: "\\(ta.*",
    quality_scarab: "\\(hi.*",
    rarity_prefix: "a: ",
    rarity_normal: "N",
    rarity_magic: "M",
    rarity_rare: "R",
    corrupted: "upto",
    unidentified: "n id",
  },
  THAI: {
    quantity: "ลาสด.*",
    packsize: "งมอนสเตอร์:.*",
    mapdrop: "มแผ.*",
    itemrarity: "กขอ.*",
    currency: "า อ.*",
    scarab: "มส.*",
    divination: "มไ.*",
    quality_regular: "น\\).*",
    quality_currency: "า\\).*",
    quality_divination: "\\(ไ.*",
    quality_rarity: "ก\\).*",
    quality_packsize: "\\(ข.*",
    quality_scarab: "ย\\).*",
    rarity_prefix: "ก: ",
    rarity_normal: "ป",
    rarity_magic: "เ",
    rarity_rare: "แ",
    corrupted: "มล",
    unidentified: "จส",
  },
  CHINESE: {
    quantity: "^輿圖掉落物.*",
    packsize: "^怪物群大小.*",
    mapdrop: "^更多地圖.*",
    itemrarity: "^物品稀有度.*",
    currency: "通貨:.*",
    scarab: "^更多.*綢帶.*",
    divination: "命運卡:.*",
    quality_regular: "^品質.*數量.*",
    quality_currency: "^品質.*通貨.*",
    quality_divination: "^品質.*命運卡.*",
    quality_rarity: "^品質.*稀有度.*",
    quality_packsize: "^品質.*怪物群大小.*",
    quality_scarab: "^品質.*綢帶.*",
    rarity_prefix: "^稀有度: ",
    rarity_normal: "普通",
    rarity_magic: "魔法",
    rarity_rare: "稀有",
    corrupted: "^已汙染$",
    unidentified: "^未鑑定$",
  },
};
