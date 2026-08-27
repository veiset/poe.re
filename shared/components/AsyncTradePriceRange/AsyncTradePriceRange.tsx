import {useEffect, useRef, useState} from "react";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import PriceRangeSlider from "@shared/components/PriceRangeSlider/PriceRangeSlider";
import {PRICE_RANGE_MAX, PRICE_RANGE_MIN} from "@shared/core/PriceRange";
import "./AsyncTradePriceRange.css";

const PRICE_LIMITS = [PRICE_RANGE_MIN, PRICE_RANGE_MAX];
const DEFAULT_CURRENCIES = ["chaos", "divine"] as const;

export type AsyncTradePriceCurrency = "chaos" | "exalted" | "divine";

export interface AsyncTradePriceRangeValue<TCurrency extends AsyncTradePriceCurrency = AsyncTradePriceCurrency> {
  min: string;
  max: string;
  currency: TCurrency;
  enabled: boolean;
  tradeEnabled: boolean;
}

export interface AsyncTradePriceRangeProps<TCurrency extends AsyncTradePriceCurrency> {
  value: AsyncTradePriceRangeValue<TCurrency>;
  onChange: (value: AsyncTradePriceRangeValue<TCurrency>) => void;
  currencies?: readonly TCurrency[];
}

const AsyncTradePriceRange = <TCurrency extends AsyncTradePriceCurrency = (typeof DEFAULT_CURRENCIES)[number]>({
  value,
  onChange,
  currencies = DEFAULT_CURRENCIES as unknown as readonly TCurrency[],
}: AsyncTradePriceRangeProps<TCurrency>) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`async-price-anchor${open ? " async-price-anchor-open" : ""}`} ref={popoverRef}>
      <button
        type="button"
        className={`async-price-button${open ? " async-price-button-open" : ""}`}
        title="Price range"
        aria-label="Configure price range"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        Price
      </button>
      {open && (
        <div className="async-price-modal" role="dialog" aria-label="Async trade price range">
          <PriceRangeSlider
            id="async-trade-price"
            minValue={value.min}
            maxValue={value.max}
            onMinChange={(min) => onChange({...value, min})}
            onMaxChange={(max) => onChange({...value, max})}
            availablePrices={PRICE_LIMITS}
            unit={value.currency}
            allowZero
          />
          <div className="async-price-modal-footer">
            <div className="async-price-currency" role="group" aria-label="Price currency">
              {currencies.map((currency) => (
                <button
                  type="button"
                  key={currency}
                  className={value.currency === currency ? "active" : ""}
                  aria-pressed={value.currency === currency}
                  onClick={() => onChange({...value, currency})}
                >
                  {currency}
                </button>
              ))}
            </div>
            <div className="async-price-destinations">
              <Checkbox
                label="Add to regex"
                value={value.enabled}
                onChange={(enabled) => onChange({...value, enabled})}
              />
              <Checkbox
                label="Add to trade search"
                value={value.tradeEnabled}
                onChange={(tradeEnabled) => onChange({...value, tradeEnabled})}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsyncTradePriceRange;
