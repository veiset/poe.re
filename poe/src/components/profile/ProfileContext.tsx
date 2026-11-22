import {createContext} from "react";
import {loadSettings, selectedProfile} from "../../utils/LocalStorage";
import {GGPKLanguage} from "../../utils/Languages";
import type {Language} from "@shared/typedefs/Language";

export const ProfileContext = createContext<{
  globalProfile: string;
  lang: Language;
  setLang: (lang: Language) => void;
  setGlobalProfile: (profile: string) => void;
  reloadProfile?: () => void;
}>({
  globalProfile: selectedProfile(),
  lang: loadSettings(selectedProfile()).language,
  setLang: (lang: Language) => {
  },
  setGlobalProfile: (profile: string) => {
  },
  reloadProfile: () => {
  },
});