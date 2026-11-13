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
    packsize: "iz.*",
    mapdrop: "re maps.*",
    itemrarity: "m rar.*",
    currency: "cy:.*",
    scarab: "e thr.*",
    divination: "div.*",
    quality_regular: "ty \\(Quantity\\):.*",
    quality_currency: "\\(Curr.*",
    quality_divination: "\\(div.*",
    quality_rarity: "ty\\).*",
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
    mapdrop: "age.*car.*",
    itemrarity: "ete d.*",
    currency: "etair.*",
    scarab: "e fils.*",
    divination: "vin.*",
    quality_regular: TRANSLATION_NEED,
    quality_currency: "\\(ob.*",
    quality_divination: "\\(car.*",
    quality_rarity: "\\(ra.*",
    quality_packsize: "\\(tai.*",
    quality_scarab: "\\(fil.*",
    rarity_prefix: "e: ",
    rarity_normal: "n",
    rarity_magic: "m",
    rarity_rare: "r",
    corrupted: "mpu",
    unidentified: "on id",
  },
  GERMAN: {
    quantity: TRANSLATION_NEED,
    packsize: TRANSLATION_NEED,
    mapdrop: TRANSLATION_NEED,
    itemrarity: TRANSLATION_NEED,
    currency: TRANSLATION_NEED,
    scarab: TRANSLATION_NEED,
    divination: TRANSLATION_NEED,
    quality_regular: TRANSLATION_NEED,
    quality_currency: TRANSLATION_NEED,
    quality_divination: TRANSLATION_NEED,
    quality_rarity: TRANSLATION_NEED,
    quality_packsize: TRANSLATION_NEED,
    quality_scarab: TRANSLATION_NEED,
    rarity_prefix: TRANSLATION_NEED,
    rarity_normal: TRANSLATION_NEED,
    rarity_magic: TRANSLATION_NEED,
    rarity_rare: TRANSLATION_NEED,
    corrupted: TRANSLATION_NEED,
    unidentified: TRANSLATION_NEED,
  },
  JAPANESE: {
    quantity: TRANSLATION_NEED,
    packsize: TRANSLATION_NEED,
    mapdrop: TRANSLATION_NEED,
    itemrarity: TRANSLATION_NEED,
    currency: TRANSLATION_NEED,
    scarab: TRANSLATION_NEED,
    divination: TRANSLATION_NEED,
    quality_regular: TRANSLATION_NEED,
    quality_currency: TRANSLATION_NEED,
    quality_divination: TRANSLATION_NEED,
    quality_rarity: TRANSLATION_NEED,
    quality_packsize: TRANSLATION_NEED,
    quality_scarab: TRANSLATION_NEED,
    rarity_prefix: TRANSLATION_NEED,
    rarity_normal: TRANSLATION_NEED,
    rarity_magic: TRANSLATION_NEED,
    rarity_rare: TRANSLATION_NEED,
    corrupted: TRANSLATION_NEED,
    unidentified: TRANSLATION_NEED,
  },
  KOREAN: {
    quantity: TRANSLATION_NEED,
    packsize: TRANSLATION_NEED,
    mapdrop: TRANSLATION_NEED,
    itemrarity: TRANSLATION_NEED,
    currency: TRANSLATION_NEED,
    scarab: TRANSLATION_NEED,
    divination: TRANSLATION_NEED,
    quality_regular: TRANSLATION_NEED,
    quality_currency: TRANSLATION_NEED,
    quality_divination: TRANSLATION_NEED,
    quality_rarity: TRANSLATION_NEED,
    quality_packsize: TRANSLATION_NEED,
    quality_scarab: TRANSLATION_NEED,
    rarity_prefix: TRANSLATION_NEED,
    rarity_normal: TRANSLATION_NEED,
    rarity_magic: TRANSLATION_NEED,
    rarity_rare: TRANSLATION_NEED,
    corrupted: TRANSLATION_NEED,
    unidentified: TRANSLATION_NEED,
  },
  PORTUGUESE: {
    quantity: TRANSLATION_NEED,
    packsize: TRANSLATION_NEED,
    mapdrop: TRANSLATION_NEED,
    itemrarity: TRANSLATION_NEED,
    currency: TRANSLATION_NEED,
    scarab: TRANSLATION_NEED,
    divination: TRANSLATION_NEED,
    quality_regular: TRANSLATION_NEED,
    quality_currency: TRANSLATION_NEED,
    quality_divination: TRANSLATION_NEED,
    quality_rarity: TRANSLATION_NEED,
    quality_packsize: TRANSLATION_NEED,
    quality_scarab: TRANSLATION_NEED,
    rarity_prefix: TRANSLATION_NEED,
    rarity_normal: TRANSLATION_NEED,
    rarity_magic: TRANSLATION_NEED,
    rarity_rare: TRANSLATION_NEED,
    corrupted: TRANSLATION_NEED,
    unidentified: TRANSLATION_NEED,
  },
  RUSSIAN: {
    quantity: "ды в.*",
    packsize: "монстров.*",
    mapdrop: "ьше карт.*",
    itemrarity: "Редкость.*",
    currency: "юты:.*",
    scarab: "е нит.*",
    divination: "гадальных.*",
    quality_regular: "во\\):.*",
    quality_currency: "люта\\)*",
    quality_divination: "гадальных\\).*",
    quality_rarity: "сть\\).*",
    quality_packsize: "ппы\\).*",
    quality_scarab: "нити\\).*",
    rarity_prefix: "y: ",
    rarity_normal: "о",
    rarity_magic: "в",
    rarity_rare: "р",
    corrupted: "оскв",
    unidentified: "неоп",
  },
  SPANISH: {
    quantity: TRANSLATION_NEED,
    packsize: TRANSLATION_NEED,
    mapdrop: TRANSLATION_NEED,
    itemrarity: TRANSLATION_NEED,
    currency: TRANSLATION_NEED,
    scarab: TRANSLATION_NEED,
    divination: TRANSLATION_NEED,
    quality_regular: TRANSLATION_NEED,
    quality_currency: TRANSLATION_NEED,
    quality_divination: TRANSLATION_NEED,
    quality_rarity: TRANSLATION_NEED,
    quality_packsize: TRANSLATION_NEED,
    quality_scarab: TRANSLATION_NEED,
    rarity_prefix: TRANSLATION_NEED,
    rarity_normal: TRANSLATION_NEED,
    rarity_magic: TRANSLATION_NEED,
    rarity_rare: TRANSLATION_NEED,
    corrupted: TRANSLATION_NEED,
    unidentified: TRANSLATION_NEED,
  },
  THAI: {
    quantity: TRANSLATION_NEED,
    packsize: TRANSLATION_NEED,
    mapdrop: TRANSLATION_NEED,
    itemrarity: TRANSLATION_NEED,
    currency: TRANSLATION_NEED,
    scarab: TRANSLATION_NEED,
    divination: TRANSLATION_NEED,
    quality_regular: TRANSLATION_NEED,
    quality_currency: TRANSLATION_NEED,
    quality_divination: TRANSLATION_NEED,
    quality_rarity: TRANSLATION_NEED,
    quality_packsize: TRANSLATION_NEED,
    quality_scarab: TRANSLATION_NEED,
    rarity_prefix: TRANSLATION_NEED,
    rarity_normal: TRANSLATION_NEED,
    rarity_magic: TRANSLATION_NEED,
    rarity_rare: TRANSLATION_NEED,
    corrupted: TRANSLATION_NEED,
    unidentified: TRANSLATION_NEED,
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
