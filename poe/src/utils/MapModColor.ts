import type {MapOption as MapModsTokenOption, Token} from "@poe/types/generated/mapmods";
import {getGradientColor} from "./ColorGradient";

export const mapModTokenColor = (isSelected: boolean, token: Token<MapModsTokenOption>): string => {
    if (isSelected) return "#ffffff";
    if (token.options.scary < 100) return "#ffffff";
    if (token.options.scary > 1000) return "#eab7fc";
    return getGradientColor("#FC9090", "#ffffff", (1100 - token.options.scary) / 1100);
};
