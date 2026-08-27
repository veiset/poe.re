import Dropdown from "@shared/components/dropdown/Dropdown";
import {usePoe2League} from "@poe2/layout/Poe2LeagueContext";

const Poe2LeagueSelect = () => {
  const {league, leagues, loading, setLeague} = usePoe2League();
  const elements = loading
    ? ["Loading leagues…"]
    : leagues.length === 0
      ? ["No leagues available"]
      : leagues;

  return (
    <Dropdown
      elements={elements}
      selected={loading ? "" : league || leagues[0] || ""}
      setSelected={setLeague}
      style="dropdown-sm"
    />
  );
};

export default Poe2LeagueSelect;
