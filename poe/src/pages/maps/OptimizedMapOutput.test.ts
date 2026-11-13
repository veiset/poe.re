import {describe, expect, it} from "vitest";
import {MapStaticStatRegex} from "@poe/utils/Languages";
import type {Language} from "@shared/typedefs/Language";

// 3.30.0.1 map tooltip lines, from the game's ClientStrings and AlternateQualityTypes
const qualityQuantity: Partial<Record<Language, string>> = {
  ENGLISH: "Quality (Quantity): +20% (augmented)",
  RUSSIAN: "Качество (количество): +20% (augmented)",
  FRENCH: "Qualité (Quantité): +20% (augmented)",
  GERMAN: "Qualität (Menge): +20% (augmented)",
  JAPANESE: "品質 (数量): +20% (augmented)",
  KOREAN: "퀄리티 (수량): +20% (augmented)",
  PORTUGUESE: "Qualidade (Quantidade): +20% (augmented)",
  SPANISH: "Calidad (cantidad): +20% (augmented)",
  THAI: "ค่าคุณภาพ (จำนวน): +20% (augmented)",
  CHINESE: "品質 (數量): +20% (augmented)",
};

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
  GERMAN: {
    atlasDrops: "Atlasbeute: +45% (augmented)",
    threads: "Mehr Fäden: +12% (augmented)",
    qualityThreads: "Qualität (Fäden): +20% (augmented)",
    others: ["Gegenstandsmenge: +20% (augmented)", "Fäden: 5%", "Qualität (Menge): +20% (augmented)"],
  },
  JAPANESE: {
    atlasDrops: "アトラスドロップ: +45% (augmented)",
    threads: "スレッド量が上昇: +12% (augmented)",
    qualityThreads: "品質 (スレッド): +20% (augmented)",
    others: ["アイテム数量: +20% (augmented)", "スレッド: 5%", "品質 (数量): +20% (augmented)"],
  },
  KOREAN: {
    atlasDrops: "아틀라스 획득물: +45% (augmented)",
    threads: "실낱 더 많음: +12% (augmented)",
    qualityThreads: "퀄리티 (실낱): +20% (augmented)",
    others: ["아이템 수량: +20% (augmented)", "실낱: 5%", "퀄리티 (수량): +20% (augmented)"],
  },
  PORTUGUESE: {
    atlasDrops: "Itens do Atlas: +45% (augmented)",
    threads: "Mais Segmentos: +12% (augmented)",
    qualityThreads: "Qualidade (Segmentos): +20% (augmented)",
    others: ["Quantidade de Itens: +20% (augmented)", "Segmentos: 5%", "Qualidade (Quantidade): +20% (augmented)"],
  },
  SPANISH: {
    atlasDrops: "Botín del Atlas: +45% (augmented)",
    threads: "Más hilos: +12% (augmented)",
    qualityThreads: "Calidad (hilos): +20% (augmented)",
    others: ["Cantidad de objetos: +20% (augmented)", "hilos: 5%", "Calidad (cantidad): +20% (augmented)"],
  },
  THAI: {
    atlasDrops: "แอตลาสดรอป: +45% (augmented)",
    threads: "เพิ่มสายใย อีก: +12% (augmented)",
    qualityThreads: "ค่าคุณภาพ (สายใย): +20% (augmented)",
    others: ["จำนวนของไอเทม: +20% (augmented)", "สายใย: 5%", "ค่าคุณภาพ (จำนวน): +20% (augmented)"],
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

    const quantity = qualityQuantity[language as Language];
    if (quantity) {
      it(`${language} matches Quality (Quantity), and not Quality (Threads) or Atlas Drops`, () => {
        expect(matches(regex.quality_regular, quantity, "20")).toBe(true);
        for (const other of [l.qualityThreads, l.atlasDrops, l.threads]) {
          expect(matches(regex.quality_regular, other, "\\d+")).toBe(false);
        }
      });
    }
  }
});
