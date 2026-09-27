import {createContext} from "react";
import type {RepoeLanguageKey} from "@poe/utils/Languages";

export interface Poe2ProfileContextType {
  currentProfile: string;
  setCurrentProfile: (p: string) => void;
  language: RepoeLanguageKey;
  setLanguage: (language: RepoeLanguageKey) => void;
}

export const Poe2ProfileContext = createContext<Poe2ProfileContextType>({
  currentProfile: "default",
  setCurrentProfile: () => {
  },
  language: "ENGLISH",
  setLanguage: () => {},
});
