import React from "react";
import InfoBanner from "@poe/components/InfoBanner/InfoBanner";

const ItemInfoBanner = () => {
  return (
    <InfoBanner>
      <ul>
        <li>Clusters are missing notables</li>
        <li>Open prefix/suffix doesn't work for magic synth items</li>
        <li>Magic items with influenced mods will match any tier of the influenced mod</li>
        <li>Some ranges can be weird (the data is a bit weird)</li>
      </ul>
    </InfoBanner>
  );
};

export default ItemInfoBanner;
