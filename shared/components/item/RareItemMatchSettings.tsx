import React from "react";

interface RareItemMatchSettingsProps {
  matchAnyMod: boolean;
  setMatchAnyMod: (value: boolean) => void;
  matchPrefixAndSuffix: boolean;
  setMatchPrefixAndSuffix: (value: boolean) => void;
}

const RareItemMatchSettings = ({
  matchAnyMod,
  setMatchAnyMod,
  matchPrefixAndSuffix,
  setMatchPrefixAndSuffix,
}: RareItemMatchSettingsProps) => {
  return (
    <div className="radio-button-modgroup">
      <input
        type="radio"
        className="radio-button-map"
        id="rare-mods-all"
        name="Match any rare mod"
        checked={!matchAnyMod && !matchPrefixAndSuffix}
        onChange={() => {
          setMatchAnyMod(false);
          setMatchPrefixAndSuffix(false);
        }}
      />
      <label htmlFor="rare-mods-all" className="radio-button-map radio-first-ele">
        Match if only ALL mods are found
      </label>
      <input
        type="radio"
        id="rare-mods-any"
        name="Match all rare mods"
        checked={matchAnyMod}
        onChange={() => {
          setMatchAnyMod(true);
          setMatchPrefixAndSuffix(false);
        }}
      />
      <label htmlFor="rare-mods-any" className="radio-button-map">
        Match if ANY mod is found
      </label>
      <input
        type="radio"
        id="rare-mods-prefix-suffix"
        name="Match all rare mods"
        checked={matchPrefixAndSuffix}
        onChange={() => {
          setMatchPrefixAndSuffix(true);
          setMatchAnyMod(false);
        }}
      />
      <label htmlFor="rare-mods-prefix-suffix" className="radio-button-map">
        Match at least 1 Prefix AND 1 Suffix
      </label>
    </div>
  );
};

export default RareItemMatchSettings;
