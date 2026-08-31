import React, {useContext, useEffect, useState} from "react";
import {loadSettings, saveSettings, setSelectedProfile} from "../../localStorage";
import {Poe2ProfileContext} from "../../layout/Poe2ProfileContext";
import {defaultEmptyVendor, defaultSettings, GroupCondition, Settings, VendorGroup} from "../../settings";
import {generateVendorGroupRegex} from "./VendorResult";
import {getSelectedPropertiesFromObject} from "@shared/core/utils";
import {Checkbox} from "@shared/components/Checkbox/Checkbox";
import RegexResultBox from "@shared/components/RegexResultBox/RegexResultBox";
import Poe2Header from "@poe2/components/Poe2Header";
import FilterCard from "@shared/components/FilterCard/FilterCard";
import NumberField from "@shared/components/NumberField/NumberField";
import {useFavoritePage} from "@poe2/useFavoritePage";

export function Vendor() {
  const {currentProfile} = useContext(Poe2ProfileContext);
  const initSettings = loadSettings(currentProfile).vendor;
  const favoritePage = useFavoritePage("vendor", initSettings);
  const initialSettings = favoritePage.initialConfiguration;
  const [settings, setSettings] = useState<Settings["vendor"]>(() => initialSettings);
  const [selectedGroup, setSelectedGroup] = useState<VendorGroup>(initialSettings.vendorGroups[initialSettings.selectedGroupId]);
  const [result, setResult] = useState("");

  const removeGroup = () => {
    const groups = [...settings.vendorGroups];
    let selected = settings.selectedGroupId;
    groups.splice(settings.selectedGroupId, 1);
    if (groups.length === 0) {
      groups.push(defaultEmptyVendor);
    }
    if (settings.selectedGroupId >= groups.length) {
      selected = groups.length - 1;
    }
    setSettings({
      ...settings,
      selectedGroupId: selected,
      vendorGroups: groups
    });
    setSelectedGroup(groups[selected]);
  };

  const addGroup = () => {
    const groups = settings.vendorGroups.concat([{...defaultEmptyVendor}]);
    const selectedGroup = groups.length - 1;
    setSettings({
      ...settings,
      vendorGroups: groups,
      selectedGroupId: selectedGroup,
    })
    setSelectedGroup(groups[selectedGroup]);
  }

  const setGroup = (id: number) => {
    setSettings({
      ...settings,
      selectedGroupId: id,
    })
    setSelectedGroup(settings.vendorGroups[id])
  }

  // Save whenever settings change (for the currently selected profile)
  useEffect(() => {
    if (favoritePage.isEditingFavorite) {
      setResult(generateVendorGroupRegex({...settings, vendorGroups: settings.vendorGroups.map((group, index) => index === settings.selectedGroupId ? {...group, ...selectedGroup} : group)}));
      return;
    }
    const base = loadSettings(currentProfile);
    const updatedGroups = settings.vendorGroups.map((group, index) =>
      index === settings.selectedGroupId
        ? {...group, ...selectedGroup}
        : group
    );
    const vendor = {
      selectedGroupId: settings.selectedGroupId,
      resultSettings: settings.resultSettings,
      vendorGroups: updatedGroups,
    }
    const settingsResult: Settings = {...base, vendor: vendor, name: currentProfile};
    saveSettings(settingsResult);
    setSettings(vendor);
  }, [selectedGroup, favoritePage.isEditingFavorite]);

  useEffect(() => {
    if (favoritePage.isEditingFavorite) return;
    setResult(generateVendorGroupRegex(settings));
  }, [settings]);

  // When the selected profile changes, load its settings
  useEffect(() => {
    const gs = loadSettings(currentProfile);
    setSettings(gs.vendor);
    setSelectedProfile(currentProfile);
  }, [currentProfile, favoritePage.isEditingFavorite]);

  const isEmpty = settings.vendorGroups.length === 1 && getSelectedPropertiesFromObject(settings.vendorGroups[0]).length === 0;

  return (
    <>
      <Poe2Header text="Vendor"/>
      <RegexResultBox
        result={result}
        favorite={favoritePage.action({...settings, vendorGroups: settings.vendorGroups.map((group, index) => index === settings.selectedGroupId ? {...group, ...selectedGroup} : group)})}
        reset={() => {
          setSettings({...defaultSettings.vendor})
          setSelectedGroup({...defaultSettings.vendor.vendorGroups[0]})
        }}
        customText={settings.resultSettings.customText}
        enableCustomText={settings.resultSettings.customTextEnabled}
        autoCopy={settings.resultSettings.autoCopy}
        setCustomText={(text) => {
          setSettings({
            ...settings, resultSettings: {...settings.resultSettings, customText: text,}
          })
        }}
        onAutoCopyChange={(enable: boolean) => {
          setSettings({
            ...settings, resultSettings: {...settings.resultSettings, autoCopy: enable,}
          })
        }}
        setEnableCustomText={(enabled: boolean) => {
          setSettings({
            ...settings, resultSettings: {...settings.resultSettings, customTextEnabled: enabled,}
          })
        }}
      />
      <p className="poe2-match-text">
        {settings.vendorGroups.map((group, i) => {
          const selectedProperties = getSelectedPropertiesFromObject(group);
          const groupText = selectedProperties.map((prop, index) => (
            <span key={index}> {prop}
              {index < selectedProperties.length - 1 && (
                <span className="condition-separator"> {group.condition} </span>
              )} </span>
          ));
          return (
            <React.Fragment key={i}>
              {i > 0 && <span className="condition-separator">AND</span>}
              <span
                className={`poe2-or-group${i === settings.selectedGroupId ? " selected" : ""}`}
                onClick={() => setGroup(i)}
              >
                {groupText.length === 0
                  ? "Select conditions"
                  : groupText}
              </span>
            </React.Fragment>
          );
        })}
      </p>
      <div className="poe2-match-buttons">
        {!isEmpty && (<>
          <span className="poe2-condition-toggle-label">Within group:</span>
          <div className="radio-button-modgroup">
            <input type="radio" id="group-or" name="group-condition"
                   checked={selectedGroup.condition === GroupCondition.OR}
                   onChange={() => setSelectedGroup({...selectedGroup, condition: GroupCondition.OR})}/>
            <label htmlFor="group-or" className="radio-first-ele">OR</label>
            <input type="radio" id="group-and" name="group-condition"
                   checked={selectedGroup.condition === GroupCondition.AND}
                   onChange={() => setSelectedGroup({...selectedGroup, condition: GroupCondition.AND})}/>
            <label htmlFor="group-and">AND</label>
          </div>
          <a className="source-link" href="#" onClick={(e) => {
            e.preventDefault();
            addGroup();
          }}>
            + Add grouping
          </a>
          <a className="source-link" href="#" onClick={(e) => {
            e.preventDefault();
            removeGroup();
          }}>
            ✕ Remove current grouping
          </a>
        </>)}
      </div>
      <div className="filter-card-grid">
        <FilterCard title="Item property & attributes">
          <Checkbox label="Quality" value={selectedGroup.itemProperty.quality}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemProperty: {...selectedGroup.itemProperty, quality: b}
                    })}
          />
          <Checkbox label="Sockets" value={selectedGroup.itemProperty.sockets}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemProperty: {...selectedGroup.itemProperty, sockets: b}
                    })}
          />
          <Checkbox label="Attack speed" value={selectedGroup.itemMods.attackSpeed}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, attackSpeed: b}
                    })}
          />
          <Checkbox label="Cast speed" value={selectedGroup.itemMods.castSpeed}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, castSpeed: b}
                    })}
          />

          <p className="poe2-section-label poe2-section-label-spaced">Movement speed</p>
          <Checkbox label="Movement speed (30%)" value={selectedGroup.movementSpeed.move30}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, movementSpeed: {...selectedGroup.movementSpeed, move30: b}
                    })}
          />
          <Checkbox label="Movement speed (25%)" value={selectedGroup.movementSpeed.move25}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, movementSpeed: {...selectedGroup.movementSpeed, move25: b}
                    })}
          />
          <Checkbox label="Movement speed (20%)" value={selectedGroup.movementSpeed.move20}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, movementSpeed: {...selectedGroup.movementSpeed, move20: b}
                    })}
          />
          <Checkbox label="Movement speed (15%)" value={selectedGroup.movementSpeed.move15}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, movementSpeed: {...selectedGroup.movementSpeed, move15: b}
                    })}
          />
          <Checkbox label="Movement speed (10%)" value={selectedGroup.movementSpeed.move10}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, movementSpeed: {...selectedGroup.movementSpeed, move10: b}
                    })}
          />
          <p className="poe2-section-label poe2-section-label-spaced">Resistances</p>
          <Checkbox label="Fire resistance" value={selectedGroup.resistances.fire}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, resistances: {...selectedGroup.resistances, fire: b}
                    })}
          />
          <Checkbox label="Cold resistance" value={selectedGroup.resistances.cold}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, resistances: {...selectedGroup.resistances, cold: b}
                    })}
          />
          <Checkbox label="Lightning resistance" value={selectedGroup.resistances.lightning}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, resistances: {...selectedGroup.resistances, lightning: b}
                    })}
          />
          <Checkbox label="Chaos resistance" value={selectedGroup.resistances.chaos}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, resistances: {...selectedGroup.resistances, chaos: b}
                    })}
          />
        </FilterCard>
        <FilterCard title="Item modifiers">
          <Checkbox label="Physical damage" value={selectedGroup.itemMods.physical}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, physical: b}
                    })}
          />
          <Checkbox label="Spell damage" value={selectedGroup.itemMods.spellDamage}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, spellDamage: b}
                    })}
          />
          <Checkbox label="Elemental damage" value={selectedGroup.itemMods.elemental}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, elemental: b}
                    })}
          />
          <Checkbox label="Cold damage" value={selectedGroup.itemMods.coldDamage}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, coldDamage: b}
                    })}
          />
          <Checkbox label="Fire damage" value={selectedGroup.itemMods.fireDamage}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, fireDamage: b}
                    })}
          />
          <Checkbox label="Lightning damage" value={selectedGroup.itemMods.lightningDamage}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, lightningDamage: b}
                    })}
          />
          <Checkbox label="Chaos damage" value={selectedGroup.itemMods.chaosDamage}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, chaosDamage: b}
                    })}
          />
          <Checkbox label="+# Spirit" value={selectedGroup.itemMods.spirit}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, spirit: b}
                    })}
          />
          <Checkbox label="Increased Rarity" value={selectedGroup.itemMods.rarity}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, rarity: b}
                    })}
          />
          <Checkbox label="Maximum Life" value={selectedGroup.itemMods.maxLife}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, maxLife: b}
                    })}
          />
          <Checkbox label="Maximum Mana" value={selectedGroup.itemMods.maxMana}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, maxMana: b}
                    })}
          />
          <p className="poe2-section-label poe2-section-label-spaced">Item modifiers (skill)</p>
          <Checkbox label="+# to level of skills (any)" value={selectedGroup.itemMods.skillLevel}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, skillLevel: b}
                    })}
          />
          <Checkbox label="+# to level of minion skills" value={selectedGroup.itemMods.skillLevelMinion}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, skillLevelMinion: b}
                    })}
          />
          <Checkbox label="+# to level of melee skills" value={selectedGroup.itemMods.skillLevelMelee}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, skillLevelMelee: b}
                    })}
          />
          <Checkbox label="+# to level of all spell skills" value={selectedGroup.itemMods.skillLevelSpell}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, skillLevelSpell: b}
                    })}
          />
          <Checkbox label="+# to level of fire spell skills" value={selectedGroup.itemMods.skillLevelFire}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, skillLevelFire: b}
                    })}
          />
          <Checkbox label="+# to level of cold spell skills" value={selectedGroup.itemMods.skillLevelCold}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, skillLevelCold: b}
                    })}
          />
          <Checkbox label="+# to level of lightning spell skills" value={selectedGroup.itemMods.skillLevelLightning}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, skillLevelLightning: b}
                    })}
          />
          <Checkbox label="+# to level of chaos spell skills" value={selectedGroup.itemMods.skillLevelChaos}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, skillLevelChaos: b}
                    })}
          />
          <Checkbox label="+# to level of physical spell skills" value={selectedGroup.itemMods.skillLevelPhysical}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, skillLevelPhysical: b}
                    })}
          />
          <Checkbox label="+# to level of projectile skills" value={selectedGroup.itemMods.skillLevelProjectile}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, skillLevelProjectile: b}
                    })}
          />
          <p className="poe2-section-label poe2-section-label-spaced">Item modifiers (attributes)</p>
          <Checkbox label="Strength" value={selectedGroup.itemMods.strength}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, strength: b}
                    })}
          />
          <Checkbox label="Intelligence" value={selectedGroup.itemMods.intelligence}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, intelligence: b}
                    })}
          />
          <Checkbox label="Dexterity" value={selectedGroup.itemMods.dexterity}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemMods: {...selectedGroup.itemMods, dexterity: b}
                    })}
          />
        </FilterCard>

        <FilterCard title="Levels & rarity">
          <p className="poe2-section-label">Item level</p>
          <NumberField id="item-min-level" label="Min level"
                       value={selectedGroup.itemLevel.min}
                       onChange={(v) => {
                         setSelectedGroup({
                           ...selectedGroup,
                           itemLevel: {...selectedGroup.itemLevel, min: v}
                         })
                       }}
          />
          <NumberField id="item-max-level" label="Max level"
                       value={selectedGroup.itemLevel.max}
                       onChange={(v) => {
                         setSelectedGroup({
                           ...selectedGroup,
                           itemLevel: {...selectedGroup.itemLevel, max: v}
                         })
                       }}
          />

          <p className="poe2-section-label poe2-section-label-spaced">Character level</p>
          <NumberField id="char-min-level" label="Min level"
                       value={selectedGroup.characterLevel.min}
                       onChange={(v) => {
                         setSelectedGroup({
                           ...selectedGroup,
                           characterLevel: {...selectedGroup.characterLevel, min: v}
                         })
                       }}
          />
          <NumberField id="char-max-level" label="Max level"
                       value={selectedGroup.characterLevel.max}
                       onChange={(v) => {
                         setSelectedGroup({
                           ...selectedGroup,
                           characterLevel: {...selectedGroup.characterLevel, max: v}
                         })
                       }}
          />

          <p className="poe2-section-label poe2-section-label-spaced">Item rarity</p>
          <Checkbox label="Rare" value={selectedGroup.itemType.rare}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemType: {...selectedGroup.itemType, rare: b}
                    })}
          />
          <Checkbox label="Magic" value={selectedGroup.itemType.magic}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemType: {...selectedGroup.itemType, magic: b}
                    })}
          />
          <Checkbox label="Normal" value={selectedGroup.itemType.normal}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemType: {...selectedGroup.itemType, normal: b}
                    })}
          />
        </FilterCard>
        <FilterCard title="Item class">
          <p className="poe2-section-label">Jewellery</p>
          <Checkbox label="Amulets" value={selectedGroup.itemClass.amulets}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, amulets: b}
                    })}
          />
          <Checkbox label="Rings" value={selectedGroup.itemClass.rings}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, rings: b}
                    })}
          />
          <Checkbox label="Belts" value={selectedGroup.itemClass.belts}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, belts: b}
                    })}
          />

          <p className="poe2-section-label poe2-section-label-spaced">1H weapons</p>
          <Checkbox label="Wands" value={selectedGroup.itemClass.wands}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, wands: b}
                    })}
          />
          <Checkbox label="One Hand Maces" value={selectedGroup.itemClass.oneHandMaces}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, oneHandMaces: b}
                    })}
          />
          <Checkbox label="Sceptres" value={selectedGroup.itemClass.sceptres}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, sceptres: b}
                    })}
          />

          <p className="poe2-section-label poe2-section-label-spaced">2h weapons</p>
          <Checkbox label="Bows" value={selectedGroup.itemClass.bows}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, bows: b}
                    })}
          />
          <Checkbox label="Staves" value={selectedGroup.itemClass.staves}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, staves: b}
                    })}
          />
          <Checkbox label="Two Hand Maces" value={selectedGroup.itemClass.twoHandMaces}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, twoHandMaces: b}
                    })}
          />
          <Checkbox label="Quarterstaves" value={selectedGroup.itemClass.quarterstaves}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, quarterstaves: b}
                    })}
          />
          <Checkbox label="Spears" value={selectedGroup.itemClass.spears}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, spears: b}
                    })}
          />
          <Checkbox label="Crossbows" value={selectedGroup.itemClass.crossbows}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, crossbows: b}
                    })}
          />
          <Checkbox label="Talisman" value={selectedGroup.itemClass.talisman}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, talisman: b}
                    })}
          />

          <p className="poe2-section-label poe2-section-label-spaced">Equipment</p>
          <Checkbox label="Gloves" value={selectedGroup.itemClass.gloves}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, gloves: b}
                    })}
          />
          <Checkbox label="Boots" value={selectedGroup.itemClass.boots}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, boots: b}
                    })}
          />
          <Checkbox label="Body Armours" value={selectedGroup.itemClass.bodyArmours}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, bodyArmours: b}
                    })}
          />
          <Checkbox label="Helmets" value={selectedGroup.itemClass.helmets}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, helmets: b}
                    })}
          />

          <p className="poe2-section-label poe2-section-label-spaced">Offhand</p>
          <Checkbox label="Quivers" value={selectedGroup.itemClass.quivers}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, quivers: b}
                    })}
          />
          <Checkbox label="Foci" value={selectedGroup.itemClass.foci}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, foci: b}
                    })}
          />
          <Checkbox label="Shields" value={selectedGroup.itemClass.shields}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, shields: b}
                    })}
          />
          <Checkbox label="Bucklers" value={selectedGroup.itemClass.bucklers}
                    onChange={(b) => setSelectedGroup({
                      ...selectedGroup, itemClass: {...selectedGroup.itemClass, bucklers: b}
                    })}
          />
        </FilterCard>
      </div>
    </>
  )
}
