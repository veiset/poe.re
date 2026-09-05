import Collapsable from "@poe/components/collapsable/Collapsable";
import {PoeNinjaItem, PriceData, PricedItemWithFallback} from "./ExpeditionTypes";
import type {Expedition} from "@poe/types/generated/expedition";
import {ItemDisplay} from "./ExpeditionRow";

export interface ExpeditionHelpProps {
    priceData: PriceData
    leaguePrices: PoeNinjaItem[]
    fallbackPrices: PoeNinjaItem[]
    expedition: Expedition
}

export const ExpeditionHelp = (props: ExpeditionHelpProps) => {
    const {leaguePrices, fallbackPrices, expedition} = props;
    const allEconomyItems = Array.from(new Set(leaguePrices.concat(fallbackPrices).map((e) => e.name)));
    const newItems = allEconomyItems.filter((x) => !expedition.uniquesSeen.includes(x));

    const bases = Object.keys(expedition.baseTypeRegex);
    const sampleItemFallback: PricedItemWithFallback = {
        item: expedition.baseTypeRegex[bases[0]].items[0],
        fallbackPrice: 10,
        price: undefined,
        displayPrice: 10
    }
    const expensiveItem: PricedItemWithFallback = {
        item: expedition.baseTypeRegex[bases[1]].items[0],
        fallbackPrice: 3200,
        price: 3800,
        displayPrice: 3800
    }
    const regularItem: PricedItemWithFallback = {
        item: expedition.baseTypeRegex[bases[2]].items[0],
        fallbackPrice: 93,
        price: 120,
        displayPrice: 120
    }
    return (
        <Collapsable header={"Explanation / Help"}>
            <div className="expedition-help-heading">Examples of items</div>
            <div className="row small-padding">
                <ItemDisplay pricedItem={regularItem}/>
                a regular item where the price is shown (in this case {regularItem.displayPrice} chaos)
            </div>
            <div className="row small-padding">
                <ItemDisplay pricedItem={expensiveItem}/>
                an expensive item ({expensiveItem.displayPrice} chaos is rounded up to 4000 and shown as 4k)
            </div>
            <div className="row small-padding">
                <ItemDisplay pricedItem={sampleItemFallback}/>
                an item with no price data in the current league (the price will be marked with a question mark '{sampleItemFallback.displayPrice}?')
            </div>

            <div className="expedition-help-heading">Minimum chaos value</div>
            <div>
                Items hidden by the minimum chaos value filter will STILL be matched by the regex.
                This option is meant to reduce visual clutter on the webpage.
                You can still search for items hidden by the filter and add them and they will be added to the regex.
            </div>


            <div className="expedition-help-heading">When is the data updated?</div>
            <div>Items data for each league is fetched from poe.ninja every hour and is automatically updated.</div>

            <div className="expedition-help-heading">Real time data</div>
            <div>
                After deploying a new version of the page there will be a small delay before the economy files are fetched.
                During that time you will get a warning about no real time data and all items will be using the fallback economy files,
                you can still use the page but the economy data is out of date.
                This will typically only last for 5-10 minutes after a new version of the webpage is deployed.
            </div>
            <div className="expedition-help-heading">Missing items</div>
            <div>
                If you find any items missing, or items that shouldn't show up, such as an item that cannot be chanced please
                report them at <a className="source-link" href="https://github.com/veiset/poe.re/issues">the issue tracker</a>.
                <br/>
                There are currently <span className="span-help-number">{expedition.numberOfUniques}</span> uniques known by the generator,
                of which <span className="span-help-number">{expedition.obtainableItems}</span> are obtainable from Gwennen.
            </div>
            <div>
                <br/>
                {newItems.length > 0
                    ? <div>
                        Number of items from the real time data not seen by the generator: {newItems.length}
                        <br/> Items currently not considered by the regex: {newItems.map((e) => <span key={e} className="unseen-unique"> {e},</span>)}
                    </div>
                    : <div>All the items in the real time economy data is know by the regex generator, but bugs might still occur.</div>
                }
            </div>

        </Collapsable>
    )
}
