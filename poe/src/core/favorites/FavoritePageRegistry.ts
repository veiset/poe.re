import vendorIcon from "@shared/img/linkicons/fusing.png";
import mapIcon from "@shared/img/linkicons/crimson_temple_map.png";
import boatIcon from "@shared/img/chart.png";
import itemIcon from "@shared/img/linkicons/alteration.png";
import expeditionIcon from "@shared/img/linkicons/expeidition_reroll.png";
import heistIcon from "@shared/img/linkicons/blueprint.png";
import beastIcon from "@shared/img/BestiaryOrbFull.png";
import tattooIcon from "@shared/img/tattoo.png";
import runegraftIcon from "@shared/img/runegraft.png";
import scarabIcon from "@shared/img/scarab.png";
import jewelIcon from "@shared/img/linkicons/cobalt.png";
import gemIcon from "@shared/img/gem.png";
import {Poe1FavoritePageKey} from "./FavoriteTypes";

export interface FavoritePageDefinition { key: Poe1FavoritePageKey; label: string; route: string; icon: string; languageDependent: boolean }

export const FAVORITE_PAGE_REGISTRY: Record<Poe1FavoritePageKey, FavoritePageDefinition> = {
  vendor: {key: "vendor", label: "Vendor", route: "/vendor", icon: vendorIcon, languageDependent: false},
  maps: {key: "maps", label: "Map mods", route: "/maps", icon: mapIcon, languageDependent: true},
  boat: {key: "boat", label: "Boat", route: "/boat", icon: boatIcon, languageDependent: false},
  items: {key: "items", label: "Items", route: "/items", icon: itemIcon, languageDependent: false},
  expedition: {key: "expedition", label: "Expedition", route: "/expedition", icon: expeditionIcon, languageDependent: false},
  heist: {key: "heist", label: "Heist", route: "/heist", icon: heistIcon, languageDependent: false},
  beast: {key: "beast", label: "Bestiary", route: "/beast", icon: beastIcon, languageDependent: false},
  tattoo: {key: "tattoo", label: "Tattoo", route: "/tattoo", icon: tattooIcon, languageDependent: false},
  runegraft: {key: "runegraft", label: "Runegraft", route: "/runegraft", icon: runegraftIcon, languageDependent: false},
  scarab: {key: "scarab", label: "Scarab", route: "/scarab", icon: scarabIcon, languageDependent: false},
  jewel: {key: "jewel", label: "Jewel", route: "/jewel", icon: jewelIcon, languageDependent: false},
  gems: {key: "gems", label: "Gems", route: "/gems", icon: gemIcon, languageDependent: false},
};
