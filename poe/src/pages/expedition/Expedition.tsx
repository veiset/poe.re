import {useContext, useEffect, useState} from "react";
import {BaseTypeRegex, baseTypeRegex, Item} from "@poe/generated/GeneratedExpedition";
import Header from "@poe/components/Header";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import ExpeditionRow, {ItemDisplay} from "./ExpeditionRow";
import "./Expedition.css";
import ExpeditionOptions from "./ExpeditionOptions";
import ModSearchBox from "@shared/components/ModSearchBox";
import Collapsable from "@poe/components/collapsable/Collapsable";
import relativeTime from 'dayjs/plugin/relativeTime'
import dayjs from "dayjs";
import {
  cleanUpPoeNinjaItems,
  filterPricedItems,
  showLowValueItems,
  showMostExpensiveAndValuedItems
} from "./ExpeditionFilter";
import {PoeNinjaData, PoeNinjaItem, PriceData, PricedBaseType} from "./ExpeditionTypes";
import {
  dateTextFromString,
  generateFillerBases,
  generateRegex,
  generateSortedPriceData,
  toggleSelectBaseType
} from "./ExpeditionUtils";
import {ExpeditionHelp} from "./ExpeditionHelp";
import {defaultSettings} from "@poe/utils/SavedSettings";
import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {economyUrl, fetchEconomyFile} from "@shared/economy";
import {usePoe1League} from "@shared/core/LeagueContext";
import {useFavoritePage} from "@poe/core/favorites/useFavoritePage";

dayjs.extend(relativeTime);

const allItemsFromGeneratedItems = (baseTypeRegex: { [key: string]: BaseTypeRegex }): Item[] => {
  const baseTypes: string[] = Array.from(Object.keys(baseTypeRegex));
  return baseTypes.flatMap((baseType) => {
    return baseTypeRegex[baseType].items;
  });
}

const fallbackPricing = (type: string): Promise<PoeNinjaData> => {
  return fetch(`expedition/eco_fallback_Unique${type}.json`)
    .then((r) => r.json())
}

const fetchLeaguePricing = (league: string, type: string): Promise<PoeNinjaData> => {
  return fetchEconomyFile("expedition", league, `Unique${type}`);
}

const Expedition = () => {
  const {globalProfile} = useContext(ProfileContext);
  const storedProfile = loadSettings(globalProfile);
  const favoritePage = useFavoritePage("expedition", storedProfile.expedition);
  const profile = {...storedProfile, expedition: favoritePage.initialConfiguration};
  const {league} = usePoe1League();
  const allBasesTypes = Array.from(Object.keys(baseTypeRegex));

  const allItems = allItemsFromGeneratedItems(baseTypeRegex);

  const [leaguePrices, setLeaguePrices] = useState<PoeNinjaItem[]>([]);
  const [fallbackPrices, setFallbackPrices] = useState<PoeNinjaItem[]>([]);
  const [priceData, setPriceData] = useState<PriceData>();
  const [fillerBases, setFillerBases] = useState<PricedBaseType[]>([]);

  // Settings
  const [selectedBaseTypes, setSelectedBaseTypes] = useState<string[]>(profile.expedition.selectedBaseTypes
    .filter((e) => allBasesTypes.includes(e))
  );
  const [addFillerItems, setAddFillerItems] = useState<boolean>(profile.expedition.addFillerItems);
  const [minValueToDisplay, setMinValueToDisplay] = useState<number>(profile.expedition.minValueToDisplay);
  const [minAddValue, setMinAddValue] = useState<number>(profile.expedition.minAddValue);

  // Temporary settings
  const [itemSearch, setItemSearch] = useState("");
  const [result, setResult] = useState("");
  const [lastUpdated, setLastUpdated] = useState("Outdated prices. Check back in a few mins...");
  const [displayedItems, setDisplayedItems] = useState(15);
  const settings = {selectedBaseTypes, minValueToDisplay, addFillerItems, minAddValue};

  useEffect(() => {
    if (!league) return;
    console.log("Fetching pre-data expedition data");
    Promise.all([
      fallbackPricing("Accessory"),
      fallbackPricing("Armour"),
      fallbackPricing("Jewel"),
      fallbackPricing("Weapon"),
    ]).then((responses) => {
      const valuedItems = cleanUpPoeNinjaItems(responses.flatMap((d) => d.lines));
      setFallbackPrices(valuedItems);
    });
    fetch(economyUrl("generated.txt"))
      .then((r) => r.text())
      .then((date) => {
        setLastUpdated(dateTextFromString(date));
      });
  }, []);

  useEffect(() => {
    const priceData = generateSortedPriceData(allItems, fallbackPrices, leaguePrices);
    setPriceData(priceData)
  }, [fallbackPrices, leaguePrices]);

  useEffect(() => {
    Promise.all([
      fetchLeaguePricing(league, "Accessory"),
      fetchLeaguePricing(league, "Armour"),
      fetchLeaguePricing(league, "Jewel"),
      fetchLeaguePricing(league, "Weapon"),
    ]).then((responses) => {
      const pricedObtainableItems = cleanUpPoeNinjaItems(responses.flatMap((d) => d.lines));
      setLeaguePrices(pricedObtainableItems);
    }).catch(() => {
      console.warn("Fetching of real time data failed");
    });
  }, [league]);


  useEffect(() => {
    if (priceData && addFillerItems) {
      const fillerBases = generateFillerBases(selectedBaseTypes, priceData, minAddValue);
      setFillerBases(fillerBases);
      setResult(generateRegex(selectedBaseTypes, fillerBases.map((e) => e.baseType)));
    } else {
      setFillerBases([]);
      setResult(generateRegex(selectedBaseTypes, []));
    }
  }, [priceData, addFillerItems, selectedBaseTypes, leaguePrices, minAddValue]);

  useEffect(() => {
    if (!favoritePage.isEditingFavorite) updateSettings(globalProfile, (latest) => ({...latest, expedition: settings}));
  }, [selectedBaseTypes, minValueToDisplay, addFillerItems, minAddValue]);

  if (priceData === undefined) {
    return <div>Loading...</div>;
  }

  const warning = priceData.usingOnlyFallback ? `Warning: Could not find economy data for ${league}, using fallback. (new webpage version being deployed)` : undefined;

  return (
    <>
      <Header text={"Gwennen Expedition"}/>
      <RegexResultBox result={result} warning={warning} favorite={favoritePage.action(settings, {language: storedProfile.language, league}, !priceData ? "Economy data is still loading." : undefined)} reset={() => {
        setSelectedBaseTypes(defaultSettings.expedition.selectedBaseTypes);
        setMinValueToDisplay(defaultSettings.expedition.minValueToDisplay);
        setAddFillerItems(defaultSettings.expedition.addFillerItems);
        setMinAddValue(defaultSettings.expedition.minAddValue);
      }}/>
      {priceData.usingOnlyFallback && <div></div>}
      <ExpeditionOptions
        lastUpdate={lastUpdated}
        expensiveUniques={addFillerItems}
        setExpensiveUniques={setAddFillerItems}
        minAddValue={minAddValue}
        setMinAddValue={setMinAddValue}
      />
      <div className="row expedition-selection-header">
        <div className="expedition-col-40">Selected items</div>
        <div className="expedition-col-60">Automatically added</div>
      </div>
      <div className="row expedition-item-regex-area">
        <div className="expedition-col-40">
          {filterPricedItems(
            priceData.pricedBaseTypes.filter((pricedBase) => selectedBaseTypes.includes(pricedBase.baseType)),
            showMostExpensiveAndValuedItems(minValueToDisplay)
          ).map((pricedItem) => {
            return <ItemDisplay
              pricedItem={pricedItem}
              key={pricedItem.item.name}
              onClick={() => {
                toggleSelectBaseType(selectedBaseTypes, setSelectedBaseTypes, pricedItem.item.baseType)
              }}
            />
          })}
        </div>
        <div className={"expedition-col-60" + (addFillerItems ? "" : " expedition-fade")}>
          {filterPricedItems(
            fillerBases,
            showMostExpensiveAndValuedItems(minValueToDisplay)
          ).map((pricedItem) => {
            return <ItemDisplay
              pricedItem={pricedItem}
              key={pricedItem.item.name}
              onClick={() => {
                toggleSelectBaseType(selectedBaseTypes, setSelectedBaseTypes, pricedItem.item.baseType)
              }}
            />;
          })}
        </div>
      </div>
      <div className="row">
        <Collapsable header={"Show all other items that will also match (based on selected basetypes)"}>
          {filterPricedItems(
            priceData.pricedBaseTypes
              .filter((pricedBase) => selectedBaseTypes.includes(pricedBase.baseType))
              .concat(fillerBases),
            showLowValueItems(minValueToDisplay)
          ).map((pricedItem, i) => {
            return <ItemDisplay key={pricedItem.item.name + i} pricedItem={pricedItem}/>
          })}
        </Collapsable>
      </div>
      <div className="row">
        <ExpeditionHelp priceData={priceData} leaguePrices={leaguePrices} fallbackPrices={fallbackPrices}/>
      </div>
      <div className="row">
        <div className="expedition-col-40">
          <ModSearchBox id="item-search" placeholder="Search for an item ..." search={itemSearch}
                        setSearch={setItemSearch}/>
        </div>
        <div className="expedition-col-60">
          Minimum chaos value to display:
          <input type="search" className="modifier-quantity-box" id="pack-size" name="search-mod"
                 value={minValueToDisplay}
                 onChange={v => setMinValueToDisplay(v.target.value as unknown as number)}/>
          (most expensive of a base will still be shown)
        </div>
      </div>
      <div className="full-size expedition-row-container">
        {priceData.pricedBaseTypes
          .filter((e) => {
            if (!itemSearch || itemSearch.length < 3) return true;
            if (e.baseType.toLowerCase().includes(itemSearch.toLowerCase())) return true;

            const search = itemSearch.toLowerCase();
            return e.baseType.toLowerCase().includes(search) || e.items.some((e) => e.item.name.toLowerCase().includes(search));
          })
          .slice(0, displayedItems).map((base) => {
            return (<ExpeditionRow
              pricedBaseType={base}
              setSelectedBaseType={setSelectedBaseTypes}
              selectedBaseTypes={selectedBaseTypes}
              minValueToDisplay={minValueToDisplay}
              itemSearch={itemSearch}
              key={base.baseType}
            />)
          })}
      </div>
      <div className="full-size expedition-load-wrap">
        <button className="expedition-load-more"
                onClick={() => {
                  setDisplayedItems(displayedItems + 10);
                }}
        >Load more items ...
        </button>
      </div>
      <div className="full-size"></div>
    </>
  );
};

export default Expedition;
