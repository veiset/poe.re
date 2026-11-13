import {describe, expect, it} from "vitest";
import {MapStaticStatRegex} from "@poe/utils/Languages";
import type {Language} from "@shared/typedefs/Language";

// 3.30.0.1 map tooltip lines, from the game's ClientStrings and AlternateQualityTypes
const lines: Partial<Record<Language, { atlasDrops: string; threads: string; qualityThreads: string; others: string[] }>> = {
  ENGLISH: {
    atlasDrops: "Atlas Drops: +45% (augmented)",
    threads: "More Threads: +12% (augmented)",
    qualityThreads: "Quality (Threads): +20% (augmented)",
    others: ["Item Quantity: +20% (augmented)", "Threads: 5%", "Quality (Quantity): +20% (augmented)",
      "This Map's Modifiers to Atlas Drops also apply to Item Rarity"],
  },
  FRENCH: {
    atlasDrops: "Butin de l'Atlas: +45% (augmented)",
    threads: "Davantage de Fils: +12% (augmented)",
    qualityThreads: "Qualité (Fils): +20% (augmented)",
    others: ["Quantité d'objets: +20% (augmented)", "Fils: 5%", "Qualité (Quantité): +20% (augmented)"],
  },
  RUSSIAN: {
    atlasDrops: "Награды в Атласе: +45% (augmented)",
    threads: "Больше нитей: +12% (augmented)",
    qualityThreads: "Качество (нити): +20% (augmented)",
    others: ["Количество предметов: +20% (augmented)", "Нити: 5%", "Качество (количество): +20% (augmented)"],
  },
  CHINESE: {
    atlasDrops: "輿圖掉落物: +45% (augmented)",
    threads: "更多 綢帶: +12% (augmented)",
    qualityThreads: "品質(綢帶): +20% (augmented)",
    others: ["物品數量: +20% (augmented)", "綢帶: 5%", "品質 (數量): +20% (augmented)"],
  },
};

const matches = (term: string, line: string, value: string) => new RegExp(`${term}${value}%`, "i").test(line);

describe("MapStaticStatRegex on 3.30 maps", () => {
  for (const [language, l] of Object.entries(lines)) {
    const regex = MapStaticStatRegex[language as Language];
    it(`${language} matches Atlas Drops and Threads, and nothing else`, () => {
      expect(matches(regex.quantity, l.atlasDrops, "45")).toBe(true);
      expect(matches(regex.scarab, l.threads, "12")).toBe(true);
      expect(matches(regex.quality_scarab, l.qualityThreads, "20")).toBe(true);
      for (const other of [...l.others, l.threads, l.qualityThreads]) {
        expect(matches(regex.quantity, other, "\\d+")).toBe(false);
      }
      for (const other of [...l.others, l.atlasDrops, l.qualityThreads]) {
        expect(matches(regex.scarab, other, "\\d+")).toBe(false);
      }
      for (const other of [...l.others, l.atlasDrops, l.threads]) {
        expect(matches(regex.quality_scarab, other, "\\d+")).toBe(false);
      }
    });
  }
});
