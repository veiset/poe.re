import {Scarab} from "@poe/generated/GeneratedScarabs";
import chaosOrb from "@shared/img/Chaos_Orb_inventory_icon.png";
import {Dispatch, SetStateAction} from "react";

interface ScarabElementProps {
  scarab: Scarab
  price: number
  isSelected: boolean
  selected: string[]
  setSelected: Dispatch<SetStateAction<string[]>>
}

const ScarabElement = (props: ScarabElementProps) => {

  const {scarab, price, isSelected, selected, setSelected} = props;

  return (
    <div
      className={isSelected ? "scarab-element scarab-element-selected" : "scarab-element"}
      onClick={() => {
        isSelected
          ? setSelected(selected.filter(e => e !== scarab.name))
          : setSelected(selected.concat(scarab.name));
      }}
    >
      <span className="scarab-item-tooltip">
        <img alt={scarab.name} className="scarab-img" src={"https://web.poecdn.com/" + scarab.icon}/>
        <span className="scarab-item-hover">
          {scarab.description}
        </span>
      </span>
      <div className="">
        {scarab.name}
        <span className="scarab-price"><img alt="chaos orb" className="scarab-chaos" src={chaosOrb}/>{price}</span>
      </div>
    </div>
  )
}

export default ScarabElement;