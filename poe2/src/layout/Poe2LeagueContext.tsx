import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {challengeLeague, getLeagues} from "@shared/core/TradeUrlBuilder";
import {loadWebSettings, saveWebSettings} from "../localStorage";

interface Poe2LeagueContextValue {
  league: string;
  leagues: string[];
  loading: boolean;
  setLeague: (league: string) => void;
}

const Poe2LeagueContext = createContext<Poe2LeagueContextValue>({
  league: "",
  leagues: [],
  loading: true,
  setLeague: () => {},
});

export const Poe2LeagueProvider = ({children}: {children: ReactNode}) => {
  const [league, setLeague] = useState(() => loadWebSettings().poe2League);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const selectLeague = (nextLeague: string) => {
    setLeague(nextLeague);
    saveWebSettings({...loadWebSettings(), poe2League: nextLeague});
  };

  useEffect(() => {
    getLeagues("poe2")
      .then((availableLeagues) => {
        setLeagues(availableLeagues);
        const savedLeague = loadWebSettings().poe2League;
        selectLeague(
          availableLeagues.includes(savedLeague)
            ? savedLeague
            : challengeLeague(availableLeagues),
        );
      })
      .catch((error) => {
        console.error("Failed to fetch PoE2 leagues:", error);
        setLeagues([]);
        setLeague("");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Poe2LeagueContext.Provider value={{league, leagues, loading, setLeague: selectLeague}}>
      {children}
    </Poe2LeagueContext.Provider>
  );
};

export const usePoe2League = (): Poe2LeagueContextValue => useContext(Poe2LeagueContext);
