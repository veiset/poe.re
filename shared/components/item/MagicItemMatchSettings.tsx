import React from "react";

interface MagicItemMatchSettingsProps {
  onlyIfBothPrefixAndSuffix: boolean;
  setOnlyIfBothPrefixAndSuffix: (value: boolean) => void;
  matchOpenAffix: boolean;
  setMatchOpenAffix: (value: boolean) => void;
}

const MagicItemMatchSettings = ({
  onlyIfBothPrefixAndSuffix,
  setOnlyIfBothPrefixAndSuffix,
  matchOpenAffix,
  setMatchOpenAffix,
}: MagicItemMatchSettingsProps) => {
  return (
    <div className="radio-button-modgroup">
      <input
        type="radio"
        className="radio-button-map"
        id="magic-mods-default"
        name="Magic mod matching"
        checked={!onlyIfBothPrefixAndSuffix && !matchOpenAffix}
        onChange={() => {
          setOnlyIfBothPrefixAndSuffix(false);
          setMatchOpenAffix(false);
        }}
      />
      <label htmlFor="magic-mods-default" className="radio-button-map radio-first-ele">
        Match if ANY mod is found
      </label>
      <input
        type="radio"
        id="magic-mods-both"
        name="Magic mod matching"
        checked={onlyIfBothPrefixAndSuffix && !matchOpenAffix}
        onChange={() => {
          setOnlyIfBothPrefixAndSuffix(true);
          setMatchOpenAffix(false);
        }}
      />
      <label htmlFor="magic-mods-both" className="radio-button-map">
        Match at least 1 Prefix AND 1 Suffix
      </label>
      <input
        type="radio"
        id="magic-mods-open"
        name="Magic mod matching"
        checked={matchOpenAffix && !onlyIfBothPrefixAndSuffix}
        onChange={() => {
          setOnlyIfBothPrefixAndSuffix(false);
          setMatchOpenAffix(true);
        }}
      />
      <label htmlFor="magic-mods-open" className="radio-button-map">
        Match an open prefix or suffix
      </label>
      <input
        type="radio"
        id="magic-mods-open-and-correct-affix"
        name="Magic mod matching"
        checked={matchOpenAffix && onlyIfBothPrefixAndSuffix}
        onChange={() => {
          setOnlyIfBothPrefixAndSuffix(true);
          setMatchOpenAffix(true);
        }}
      />
      <label htmlFor="magic-mods-open-and-correct-affix" className="radio-button-map">
        Match both affixes, but allow for open prefix or suffix
      </label>
    </div>
  );
};

export default MagicItemMatchSettings;
