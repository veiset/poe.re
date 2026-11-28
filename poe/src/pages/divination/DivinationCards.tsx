import {useContext, useEffect, useState} from "react";
import {HeaderWithLanguage} from "@poe/components/Header";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import {defaultSettings} from "@poe/utils/SavedSettings";
import {loadDivinationCards} from "@poe/utils/loadData";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import {Spinner} from "@shared/components/Spinner/Spinner";
import {ErrorCard} from "@shared/components/GeneratedData/ErrorCard";
import {usePoe1League} from "@shared/core/LeagueContext";
import {economyUrl, fetchEconomyFile} from "@shared/economy";
import {errorMessage} from "@shared/generatedData";
import type {Language} from "@shared/typedefs/Language";
import type {DivinationCardsRegex} from "@shared/typedefs/poe1/DivinationCards";
import {joinDivinationPrices, PoeNinjaCardData} from "./DivinationData";
import {DivinationPriceRegexResult, maxDivinationRegexLength, selectDivinationPriceRegex} from "./DivinationOutput";
import "./Divination.css";

interface PriceState {
  league: string;
  data?: PoeNinjaCardData;
  error?: string;
}

const emptyEconomy: PoeNinjaCardData = {items: [], lines: []};

const DivinationPage = ({profileName, language}: {profileName: string; language: Language}) => {
  const profile = loadSettings(profileName);
  const {league, loading: leaguesLoading} = usePoe1League();
  const [minPrice, setMinPrice] = useState(profile.divination.minPrice);
  const [maxPrice, setMaxPrice] = useState(profile.divination.maxPrice);
  const [catalogs, setCatalogs] = useState<{english: DivinationCardsRegex; localized: DivinationCardsRegex}>();
  const [catalogError, setCatalogError] = useState<string>();
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [prices, setPrices] = useState<PriceState>();
  const [priceAttempt, setPriceAttempt] = useState(0);
  const [refreshTime, setRefreshTime] = useState<{league: string; text: string}>();
  const [generated, setGenerated] = useState<{context: string; result: DivinationPriceRegexResult}>();

  useEffect(() => {
    let active = true;
    setCatalogs(undefined);
    setCatalogError(undefined);
    setGenerated(undefined);
    Promise.all([loadDivinationCards("ENGLISH"), loadDivinationCards(language)])
      .then(([english, localized]) => {
        if (active) setCatalogs({english, localized});
      })
      .catch((error) => {
        if (active) setCatalogError(errorMessage(error));
      });
    return () => { active = false; };
  }, [language, catalogAttempt]);

  useEffect(() => {
    let active = true;
    setPrices(undefined);
    setGenerated(undefined);
    if (leaguesLoading || !league) return;
    fetchEconomyFile<PoeNinjaCardData>("divination", league, "DivinationCard")
      .then((data) => {
        if (active) setPrices({league, data});
      })
      .catch((error) => {
        if (active) setPrices({league, error: errorMessage(error)});
      });
    return () => { active = false; };
  }, [league, leaguesLoading, priceAttempt]);

  useEffect(() => {
    let active = true;
    setRefreshTime(undefined);
    if (leaguesLoading || !league) return;
    fetch(economyUrl("generated.txt"))
      .then(async (response) => {
        if (!response.ok) throw new Error("Refresh time unavailable");
        const date = new Date((await response.text()).trim());
        if (Number.isNaN(date.getTime())) throw new Error("Refresh time unavailable");
        if (active) setRefreshTime({league, text: `Economy service refreshed ${date.toLocaleString()}.`});
      })
      .catch(() => {
        if (active) setRefreshTime({league, text: "Refresh time unavailable."});
      });
    return () => { active = false; };
  }, [league, leaguesLoading, priceAttempt]);

  useEffect(() => {
    updateSettings(profileName, (latest) => ({...latest, divination: {minPrice, maxPrice}}));
  }, [profileName, minPrice, maxPrice]);

  const currentPrices = !leaguesLoading && prices?.league === league ? prices : undefined;
  const ready = !!catalogs && !!currentPrices?.data;
  const cards = catalogs
    ? joinDivinationPrices(catalogs.english, catalogs.localized, currentPrices?.data ?? emptyEconomy)
      .sort((a, b) => (b.chaosValue ?? -1) - (a.chaosValue ?? -1) || a.cardId.localeCompare(b.cardId))
    : [];
  const context = JSON.stringify([league, minPrice, maxPrice]);
  const result = ready && generated?.context === context ? generated.result : undefined;
  const included = new Set(result?.included.map((card) => card.cardId));
  const invalidRange = [minPrice, maxPrice].some((value) => value.trim() !== ""
    && (!Number.isFinite(Number(value)) || Number(value) < 0))
    || (minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice));
  const noPrices = ready && !cards.some((card) => card.chaosValue !== undefined && card.chaosValue > 0);
  const warning = result && result.included.length < result.eligibleCount
    ? `${result.included.length} of ${result.eligibleCount} eligible cards fit the ${maxDivinationRegexLength}-character limit. Narrow the price range to include different cards.`
    : undefined;

  return <>
    <HeaderWithLanguage text="Divination Card"/>
    <RegexResultBox result={result?.regex ?? ""} warning={warning} maxLength={maxDivinationRegexLength} reset={() => {
      setMinPrice(defaultSettings.divination.minPrice);
      setMaxPrice(defaultSettings.divination.maxPrice);
      setGenerated(undefined);
    }}/>
    <p className="divination-price-info">
      {league ? `Using price data from the ${league} League. ` : "No league selected. "}
      {refreshTime?.league === league ? refreshTime.text : "Loading refresh time…"} Prices refresh hourly.
    </p>
    <div className="filter-card-grid">
      <FilterCard title="Generate regex">
        <div className="divination-options-row">
          <label className="divination-field">
            Min chaos
            <input type="number" min="0" step="any" value={minPrice}
                   onChange={(event) => { setMinPrice(event.target.value); setGenerated(undefined); }}/>
          </label>
          <label className="divination-field">
            Max chaos
            <input type="number" min="0" step="any" value={maxPrice}
                   onChange={(event) => { setMaxPrice(event.target.value); setGenerated(undefined); }}/>
          </label>
          <button className="divination-action-button" disabled={!ready || noPrices || invalidRange}
                  onClick={() => setGenerated({context, result: selectDivinationPriceRegex(cards,
                    minPrice === "" ? undefined : Number(minPrice),
                    maxPrice === "" ? undefined : Number(maxPrice),
                  )})}>Generate regex</button>
        </div>
        {invalidRange && <p role="alert">Enter a non-negative price range with Min chaos no greater than Max chaos.</p>}
      </FilterCard>
    </div>
    {catalogError && <div role="alert"><ErrorCard partial title="Card data unavailable"
      text="The card catalog could not be loaded. Try again in a few minutes."
      detail={catalogError} problem="Divination card catalog unavailable"
      onRetry={() => setCatalogAttempt((attempt) => attempt + 1)}/></div>}
    {currentPrices?.error && <div role="alert"><ErrorCard partial title="Price data unavailable"
      text="Prices could not be loaded for this league. The card catalog is still available."
      detail={currentPrices.error} problem="Divination card prices unavailable"
      onRetry={() => setPriceAttempt((attempt) => attempt + 1)}/></div>}
    {!catalogs && !catalogError && <Spinner label="Loading divination cards…"/>}
    {!currentPrices && (leaguesLoading || !!league) && <Spinner label="Loading card prices…"/>}
    {!leaguesLoading && !league && <p role="status">Select an available league to load card prices.</p>}
    {noPrices && <p role="status">No card prices are available for the {league} League.</p>}
    {result && result.eligibleCount === 0 && <p role="status">No priced cards match this range.</p>}
    {catalogs && <section className="divination-card" aria-label="Divination Cards">
      <h2>Divination Cards</h2>
      <ul className="divination-list">
        {cards.map((card) => <li key={card.cardId}
          className={included.has(card.cardId) ? "divination-item divination-item-selected" : "divination-item"}>
          <span>{card.name}</span>
          <span className="divination-price">{card.chaosValue === undefined ? "No price" : `${card.chaosValue} chaos`}</span>
          {included.has(card.cardId) && <span className="divination-included">Included</span>}
        </li>)}
      </ul>
    </section>}
  </>;
};

const DivinationCards = () => {
  const {globalProfile, lang} = useContext(ProfileContext);
  return <DivinationPage key={`${globalProfile}-${lang}`} profileName={globalProfile} language={lang}/>;
};

export default DivinationCards;
