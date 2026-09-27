import vendorIcon from "@shared/img/whetstone_inventory_icon.png";
import waystoneIcon from "@shared/img/waystone_inventory_icon.png";
import tabletIcon from "@shared/img/precursortablet_inventory_icon.png";
import relicIcon from "@shared/img/relic_inventory_icon.png";
import itemIcon from "@shared/img/item_perfect_aug.png";
import {Poe2FavoritePageKey} from "./settings";

interface FavoritePageDefinition { label: string; route: string; icon: string; languageDependent: boolean }

export const FAVORITE_PAGE_REGISTRY: Record<Poe2FavoritePageKey, FavoritePageDefinition> = {
  vendor: {label: "Vendor", route: "/vendor", icon: vendorIcon, languageDependent: false},
  waystone: {label: "Waystones", route: "/waystone", icon: waystoneIcon, languageDependent: true},
  tablet: {label: "Tablets", route: "/tablet", icon: tabletIcon, languageDependent: true},
  relic: {label: "Relics", route: "/relic", icon: relicIcon, languageDependent: true},
  item: {label: "Items", route: "/item", icon: itemIcon, languageDependent: true},
};
