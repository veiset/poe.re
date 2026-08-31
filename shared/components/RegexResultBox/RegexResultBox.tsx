import "./RegexResultBox.css";
import React, {Dispatch, SetStateAction, useEffect, useState} from "react";
import {Checkbox} from "../Checkbox/Checkbox";
import {BugReport} from "../bugreport/BugReport";
import {loadWebSettings, saveWebSettings} from "../../core/WebSettings";
import {TRANSLATION_NEED} from "@poe/utils/Languages";

export interface RegexFavoriteAction {
  mode: "create" | "edit";
  favoriteName?: string;
  savedResult?: string;
  successMessage?: string;
  disabledReason?: string;
  onSave: (finalResult: string) => void | Promise<void>;
  onCancel?: () => void;
}

export interface RegexResultBoxProps {
  result: string
  reset: () => any
  customText?: string
  setCustomText?: (value: string) => void
  enableCustomText?: boolean
  setEnableCustomText?: (value: boolean) => void
  warning?: string
  error?: string
  maxLength?: number
  enableBug?: boolean
  onTradeSearch?: () => void
  tradeSearchLoading?: boolean
  middleAction?: React.ReactNode
  // Optional externally controlled auto-copy state (defaults to internal state)
  autoCopy?: boolean
  onAutoCopyChange?: (enabled: boolean) => void
  favorite?: RegexFavoriteAction
}

const RegexResultBox = (props: RegexResultBoxProps) => {
  const {
    result,
    warning,
    error,
    reset,
    customText: customTextProp,
    setCustomText: setCustomTextProp,
    enableCustomText: enableCustomTextProp,
    setEnableCustomText: setEnableCustomTextProp,
    maxLength,
    enableBug,
    onTradeSearch,
    tradeSearchLoading,
    middleAction,
    autoCopy: autoCopyProp,
    onAutoCopyChange,
    favorite,
  } = props;

  const maxLen = maxLength ?? 250;
  const webSettings = loadWebSettings();
  const [showOptions, setShowOptions] = useState(webSettings.optionsOpen);
  const [copied, setCopied] = React.useState<string | undefined>(undefined);
  const [autoCopyInternal, setAutoCopyInternal] = React.useState(false);
  const [customTextInternal, setCustomTextInternal] = useState("");
  const [enableCustomTextInternal, setEnableCustomTextInternal] = useState(customTextProp?.length ? true : false);
  const [favoriteError, setFavoriteError] = useState("");
  const [favoriteSaving, setFavoriteSaving] = useState(false);

  const customText = customTextProp ?? customTextInternal;
  const setCustomText = setCustomTextProp ?? setCustomTextInternal;
  const autoCopy = autoCopyProp ?? autoCopyInternal;
  const setAutoCopy = onAutoCopyChange ?? setAutoCopyInternal;
  const enableCustomText = enableCustomTextProp ?? enableCustomTextInternal;
  const setEnableCustomText = setEnableCustomTextProp ?? setEnableCustomTextInternal;
  const bugButton = enableBug ?? false;

  const finalResult = (customText.length > 0 && enableCustomText)
    ? `${result} ${customText}`
    : result;
  const favoriteDisabledReason = favorite?.disabledReason || (!finalResult.trim() ? "Generate a non-empty regex before saving a favorite." : undefined);

  const saveFavorite = async () => {
    if (!favorite || favoriteDisabledReason) return;
    setFavoriteSaving(true);
    setFavoriteError("");
    try {
      await favorite.onSave(finalResult);
    } catch (reason) {
      setFavoriteError(reason instanceof Error ? reason.message : "Could not save favorite");
    } finally {
      setFavoriteSaving(false);
    }
  };

  useEffect(() => {
    if (!autoCopy) return;
    if (finalResult === copied) return;

    navigator.clipboard.writeText(finalResult)
      .then(() => setCopied(finalResult))
      .catch(() => { /* permission denied; retry on next change */ });
  }, [finalResult, autoCopy, copied]);

  return (
    <div className="rrb-layout">
      <div className="rrb-result">
        <div className={finalResult === copied ? "rrb-result-text copied-good" : "rrb-result-text"}>
          {finalResult}
        </div>
        {error && <div className="error">Error: {error}</div>}
        {warning && <div className="warning">{warning}</div>}
        {finalResult.includes(TRANSLATION_NEED) &&
            <div className="warning">Some parts of the result are not translated, if you are able to translate them please
                open an issue on <a className="warning-link" href="https://github.com/veiset/poe.re/issues">GitHub</a></div>}
        {favorite?.mode === "edit" && <div className="rrb-favorite-status">
          Editing favorite{favorite.favoriteName ? `: ${favorite.favoriteName}` : ""}
          {favorite.savedResult !== undefined && favorite.savedResult !== finalResult && " — output changed; save to replace the stored snapshot"}
        </div>}
        {favorite?.successMessage && <div className="rrb-favorite-success" role="status">{favorite.successMessage}</div>}
        {favoriteError && <div className="error" role="alert">Error: {favoriteError}</div>}
        {finalResult.length > maxLen &&
            <div className="error">Error: {finalResult.length} / {maxLen} characters used - PoE client has a max limit
                of {maxLen} characters
            </div>
        }
        {finalResult.length <= maxLen &&
            <div className="rrb-result-info">
                length: {finalResult.length} / {maxLen}
            </div>
        }
      </div>
      <div className="rrb-actions">
        <button className="rrb-copy-button" onClick={() => {
          navigator.clipboard.writeText(finalResult).then(() => setCopied(finalResult)).catch(() => setCopied(undefined));
        }}>
          Copy
        </button>
        <button className="rrb-reset-button" onClick={() => {
          reset();
        }}>
          Reset
        </button>
        {onTradeSearch && (
          <button
            className="rrb-trade-button"
            onClick={onTradeSearch}
            disabled={tradeSearchLoading}
          >
            {tradeSearchLoading ? "Loading..." : "Trade"}
          </button>
        )}
        {middleAction}
        {favorite && <>
          <button className="rrb-favorite-button" type="button"
                  disabled={Boolean(favoriteDisabledReason) || favoriteSaving}
                  title={favoriteDisabledReason ?? (favorite.mode === "edit" ? "Update this favorite" : "Save the current regex as a favorite")}
                  onClick={saveFavorite}>
            {favoriteSaving ? "Saving…" : favorite.mode === "edit" ? "Update favorite" : "Favorite"}
          </button>
          {favorite.mode === "edit" && favorite.onCancel &&
            <button className="rrb-cancel-favorite-button" type="button" onClick={favorite.onCancel}>Cancel</button>}
        </>}
        <button className="rrb-option-button" onClick={() => {
          const next = !showOptions;
          setShowOptions(next);
          saveWebSettings({...loadWebSettings(), optionsOpen: next});
        }}>
          Options
        </button>
        {bugButton && <button className="rrb-bug">
            <BugReport regex={result} />
        </button> }
      </div>
      {showOptions && <div className="rrb-options">
          <Checkbox label={"Enable custom text"} value={enableCustomText} onChange={setEnableCustomText}/>
          <div className="rrb-options-custom-text">
              <input type="text" value={customText} onChange={(e) => setCustomText(e.target.value)}/>
          </div>
          <Checkbox label={"Auto copy result text"} value={autoCopy} onChange={setAutoCopy}/>
      </div>
      }
    </div>
  )

}

export interface AutoCopyCheckboxProps {
  value: boolean
  onChange: Dispatch<SetStateAction<boolean>>
}

export const AutoCopyCheckbox = (props: AutoCopyCheckboxProps) => {
  return (
    <label className="auto-copy">
      <input type="checkbox" className="checkbox-autocopy" checked={props.value}
             onChange={e => props.onChange(e.target.checked)}/>
      <span className="auto-copy-text">Auto-copy</span>
    </label>
  )
}

export default RegexResultBox;
