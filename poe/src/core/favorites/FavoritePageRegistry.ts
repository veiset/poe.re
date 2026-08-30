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
import {Poe1FavoritePageKey} from "./FavoriteTypes";

export interface FavoritePageDefinition { key: Poe1FavoritePageKey; label: string; route: string; icon: string }

export const FAVORITE_PAGE_REGISTRY: Record<Poe1FavoritePageKey, FavoritePageDefinition> = {
  vendor: {key: "vendor", label: "Vendor", route: "/vendor", icon: vendorIcon},
  maps: {key: "maps", label: "Map mods", route: "/maps", icon: mapIcon},
  boat: {key: "boat", label: "Boat", route: "/boat", icon: boatIcon},
  items: {key: "items", label: "Items", route: "/items", icon: itemIcon},
  expedition: {key: "expedition", label: "Expedition", route: "/expedition", icon: expeditionIcon},
  heist: {key: "heist", label: "Heist", route: "/heist", icon: heistIcon},
  beast: {key: "beast", label: "Bestiary", route: "/beast", icon: beastIcon},
  tattoo: {key: "tattoo", label: "Tattoo", route: "/tattoo", icon: tattooIcon},
  runegraft: {key: "runegraft", label: "Runegraft", route: "/runegraft", icon: runegraftIcon},
  scarab: {key: "scarab", label: "Scarab", route: "/scarab", icon: scarabIcon},
  jewel: {key: "jewel", label: "Jewel", route: "/jewel", icon: jewelIcon},
};
