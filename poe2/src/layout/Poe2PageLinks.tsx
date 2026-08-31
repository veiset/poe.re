import {PageNavigation} from "@shared/components/PageNavigation";
import type {NavigationItem} from "@shared/components/PageNavigation";
import vendorIcon from "@shared/img/whetstone_inventory_icon.png";
import waystoneIcon from "@shared/img/waystone_inventory_icon.png";
import tabletIcon from "@shared/img/precursortablet_inventory_icon.png";
import relicIcon from "@shared/img/relic_inventory_icon.png";
import itemIcon from "@shared/img/item_perfect_aug.png";
import favoriteIcon from "@shared/img/linkicons/favorite.svg";

const items: NavigationItem[] = [
  {text: "Favorites", icon: favoriteIcon, route: "/favorites"},
  {text: "Vendor", icon: vendorIcon, route: "/vendor"},
  {text: "Waystones", icon: waystoneIcon, route: "/waystone"},
  {text: "Tablets", icon: tabletIcon, route: "/tablet"},
  {text: "Relics", icon: relicIcon, route: "/relic"},
  {text: "Items", icon: itemIcon, route: "/item"},
];

const Poe2PageLinks = () => (
  <PageNavigation
    title="Path of Regex 2"
    otherGameLabel="Path of Exile 1 Regex"
    otherGameUrl={`${import.meta.env.VITE_POE1_URL || "https://poe.re"}/vendor`}
    statsUrl="https://p.vz.is/poe2.re"
    items={items}
  />
);

export default Poe2PageLinks;
