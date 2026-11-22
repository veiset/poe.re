import {createContext} from "react";
import type {Language} from "@shared/typedefs/Language";

export interface Poe2ProfileContextType {
  currentProfile: string;
  setCurrentProfile: (p: string) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  reloadProfile?: () => void;
}

export const Poe2ProfileContext = createContext<Poe2ProfileContextType>({
  currentProfile: "default",
  setCurrentProfile: () => {
  },
  language: "ENGLISH",
  setLanguage: () => {},
  reloadProfile: () => {},
});
