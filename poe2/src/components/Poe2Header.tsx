import {PageHeader} from "@shared/components/PageHeader";
import Poe2ProfileSelector from "./Poe2ProfileSelector";
import Poe2LeagueSelect from "./Poe2LeagueSelect";
import Poe2AdBanner from "./ads/Poe2AdBanner";
import {useContext} from "react";
import {Poe2ProfileContext} from "../layout/Poe2ProfileContext";
import {RepoeLanguage, RepoeLanguageKey} from "@poe/utils/Languages";

export interface Poe2HeaderProps {
  text: string
  languageSelect?: boolean
}

export const Poe2Header = ({text, languageSelect = false}: Poe2HeaderProps) => {
  const {language, setLanguage} = useContext(Poe2ProfileContext);
  return <>
    <PageHeader text={text}>
      <div className="profile-container">
        <div>League:</div>
        <Poe2LeagueSelect/>
        <Poe2ProfileSelector/>
        <select className="dropdown-select dropdown-sm" value={languageSelect ? language : "ENGLISH"}
                disabled={!languageSelect} aria-label="Language"
                onChange={(event) => setLanguage(event.target.value as RepoeLanguageKey)}>
          {Object.entries(RepoeLanguage).map(([key, data]) => <option key={key} value={key}>{data.flag} {data.name}</option>)}
        </select>
      </div>
    </PageHeader>
    <Poe2AdBanner/>
  </>;
};

export default Poe2Header;
