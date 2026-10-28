import {createContext, ReactNode, useContext, useEffect, useRef, useState} from "react";
import {Spinner} from "@shared/components/Spinner/Spinner";
import {errorMessage, Game, GeneratedData, loadGeneratedData} from "@shared/generatedData";
import {ErrorCard} from "./ErrorCard";

type State = "loading" | {data: GeneratedData} | {failed: string};

const GeneratedDataContext = createContext<GeneratedData | undefined>(undefined);

/** Where the game's generated files are: the data source, and for R2 the patch and commit the page uses. */
export function useGeneratedData(): GeneratedData {
  const data = useContext(GeneratedDataContext);
  if (!data) throw new Error("useGeneratedData must be used within GeneratedDataProvider");
  return data;
}

interface GeneratedDataProviderProps {
  game: Game;
  /** Runs once the data is found, before the app renders: the profile migrations. */
  beforeRender?: () => Promise<unknown>;
  children: ReactNode;
}

/**
 * The first thing the app renders: it finds the game's generated data (current.json for R2), runs
 * beforeRender, and then renders the app, which can count on the data's patch. When the data can't
 * be found, it shows an error instead, since no page works without it.
 */
export const GeneratedDataProvider = ({game, beforeRender, children}: GeneratedDataProviderProps) => {
  const [state, setState] = useState<State>("loading");
  const [attempt, setAttempt] = useState(0);
  // Started once per attempt, also when StrictMode runs the effect twice
  const started = useRef<Promise<GeneratedData>>(undefined);

  useEffect(() => {
    let active = true;
    started.current ??= loadGeneratedData(game).then(async (data) => {
      // As before the provider: a failed migration is tried again on the next visit, and the app still renders
      await beforeRender?.().catch((error) => console.error(error));
      return data;
    });
    started.current.then(
      (data) => active && setState({data}),
      (error) => {
        started.current = undefined;
        if (active) setState({failed: errorMessage(error)});
      },
    );
    return () => { active = false; };
  }, [game, beforeRender, attempt]);

  const retry = () => {
    setState("loading");
    setAttempt((count) => count + 1);
  };

  if (state === "loading") {
    return <div className="generated-data-page"><Spinner label="Loading game data…"/></div>;
  }
  if ("failed" in state) {
    return (
      <div className="generated-data-page" role="alert">
        <ErrorCard
          title="Error loading data"
          text="The site's data couldn't be loaded. Try again in a few minutes, and if it still fails, let us know on Discord or GitHub."
          detail={state.failed}
          onRetry={retry}
          problem={`Error loading data (${state.failed})`}
        />
      </div>
    );
  }
  return <GeneratedDataContext.Provider value={state.data}>{children}</GeneratedDataContext.Provider>;
};
