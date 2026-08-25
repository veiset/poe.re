import "./RegexResultBox.css";
import React, {Dispatch, SetStateAction, useEffect, useState} from "react";
import {Checkbox} from "../Checkbox/Checkbox";
import {BugReport} from "../bugreport/BugReport";
import {loadWebSettings, saveWebSettings} from "../../core/WebSettings";

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
  } = props;

  const maxLen = maxLength ?? 250;
  const webSettings = loadWebSettings();
  const [showOptions, setShowOptions] = useState(webSettings.optionsOpen);
  const [copied, setCopied] = React.useState<string | undefined>(undefined);
  const [autoCopyInternal, setAutoCopyInternal] = React.useState(false);
  const [customTextInternal, setCustomTextInternal] = useState("");
  const [enableCustomTextInternal, setEnableCustomTextInternal] = useState(customTextProp?.length ? true : false);

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
          setCopied(finalResult);
          navigator.clipboard.writeText(finalResult);
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
