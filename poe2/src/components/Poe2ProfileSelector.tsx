import React, {useContext, useState} from "react";
import "@shared/components/dropdown/Dropdown.css";
import "@shared/components/profile/Profile.css";
import ProfileEditBox from "@shared/components/profile/ProfileEditBox";
import {deleteProfile, loadProfileNames, loadSettings, saveSettings, setSelectedProfile} from "../localStorage";
import {Poe2ProfileContext} from "../layout/Poe2ProfileContext";
import {defaultSettings, Settings} from "../settings";
import ProfileExportBox from "@shared/components/profile/ProfileExportBox";
import ProfileImportBox from "@shared/components/profile/ProfileImportBox";
import {decodeProfile, encodeProfile} from "./ProfileTransfer";
import {migrateProfile} from "../migration/migrations";
import {GGPKLanguage} from "@poe/utils/Languages";
import type {Language} from "@shared/typedefs/Language";
import {useLocation, useNavigate} from "react-router-dom";
import {importPoe2Regex} from "../utils/ImportRegex";
import type {RegexImportCandidate} from "@shared/core/regex/ParseRegex";

interface Poe2ProfileSelectorProps {
  languageSelect?: boolean;
}

const Poe2ProfileSelector = ({languageSelect = false}: Poe2ProfileSelectorProps) => {
  const {currentProfile, setCurrentProfile, language, setLanguage, reloadProfile} = useContext(Poe2ProfileContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<string[]>(() => loadProfileNames());
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editName, setEditName] = useState("");
  const [copyCurrentProfile, setCopyCurrentProfile] = useState(false);
  const [warning, setWarning] = useState<string | undefined>(undefined);

  const changeProfile = (profile: string) => {
    setSelectedProfile(profile);
    setCurrentProfile(profile);
  };

  const validate = (name: string, creating: boolean): string | undefined => {
    if (name.trim() === "") return "Enter profile name";
    if (profiles.includes(name) && (creating || name !== currentProfile)) {
      return "Profile with that name already exists";
    }
    return undefined;
  };

  const confirmAdd = () => {
    const err = validate(editName, true);
    if (err) {
      setWarning(err);
      return;
    }
    const newSettings = {
      ...(copyCurrentProfile ? loadSettings(currentProfile) : defaultSettings),
      name: editName,
    };
    saveSettings(newSettings);
    setProfiles(loadProfileNames());
    changeProfile(editName);
    setShowNew(false);
  };

  const confirmEdit = () => {
    const err = validate(editName, false);
    if (err) {
      setWarning(err);
      return;
    }
    const newSettings = {...loadSettings(currentProfile), name: editName};
    saveSettings(newSettings);
    deleteProfile(currentProfile);
    setProfiles(loadProfileNames());
    changeProfile(editName);
    setShowEdit(false);
  };

  const confirmDelete = () => {
    if (currentProfile === "default" || !window.confirm(`Delete profile '${currentProfile}'?`)) return;
    deleteProfile(currentProfile);
    const names = loadProfileNames();
    setProfiles(names);
    const next = names.includes("default") ? "default" : (names[0] ?? "default");
    changeProfile(next);
  };

  const importProfile = (settings: Settings) => {
    // If the migration fails, the profile is saved on its old version and migrated on the next visit
    migrateProfile(settings).catch(() => settings).then((migrated) => {
      saveSettings(migrated);
      setProfiles(loadProfileNames());
      changeProfile(migrated.name);
      reloadProfile?.();
      setShowImport(false);
    });
  };

  const handleImportRegex = (candidate: RegexImportCandidate<Settings>) => {
    saveSettings({...candidate.settings, name: currentProfile});
    setSelectedProfile(currentProfile);
    reloadProfile?.();
    setShowImport(false);
    navigate(candidate.route);
  };

  return (
    <div className="profile-container">
      <div>Profile:</div>
      <select name="profile" className="dropdown-select dropdown-md" value={currentProfile}
              onChange={(e) => changeProfile(e.target.value)}>
        {profiles.map((profile) => (
          <option className="option-league" key={profile} value={profile}>{profile}</option>
        ))}
      </select>
      <div className="profile-actions">
        <div className="profile-icon profile-icon-large" onClick={() => {
          setShowEdit(false);
          setEditName("");
          setCopyCurrentProfile(false);
          setWarning(undefined);
          setShowNew(true);
        }}>+
        </div>
        <div className="profile-icon" onClick={() => {
          setShowNew(false);
          setEditName(currentProfile);
          setWarning(undefined);
          setShowEdit(true);
        }}>✎
        </div>
        <div className="profile-icon" onClick={confirmDelete}>✕</div>

        {showNew &&
          <ProfileEditBox
            header={"Create new profile"}
            editValue={editName}
            setEditValue={(v) => {
              setEditName(v);
              setWarning(undefined);
            }}
            show={setShowNew}
            confirm={confirmAdd}
            warning={warning}
            copyCurrentProfile={copyCurrentProfile}
            setCopyCurrentProfile={setCopyCurrentProfile}
          />
        }
        {showEdit &&
          <ProfileEditBox
            header={"Rename profile"}
            editValue={editName}
            setEditValue={(v) => {
              setEditName(v);
              setWarning(undefined);
            }}
            show={setShowEdit}
            confirm={confirmEdit}
            warning={warning}
          />
        }
      </div>
      <select
        name="language"
        className="dropdown-select dropdown-sm"
        value={languageSelect ? language : "ENGLISH"}
        disabled={!languageSelect}
        onChange={(event) => setLanguage(event.target.value as Language)}
      >
        {Object.entries(GGPKLanguage).map(([key, data]) => (
          <option className="option-language" key={key} value={key}>{data.flag} {data.name}</option>
        ))}
      </select>
      <div className="profile-actions">
        <button className="export-button" onClick={() => {
          setShowNew(false);
          setShowEdit(false);
          setShowImport(false);
          setShowExport(true);
        }}>Export</button>
        <button className="import-button" onClick={() => {
          setShowNew(false);
          setShowEdit(false);
          setShowExport(false);
          setShowImport(true);
        }}>Import</button>

        {showExport && <ProfileExportBox settings={loadSettings(currentProfile)} setShow={setShowExport}
                                                encode={encodeProfile} />}
        {showImport && <ProfileImportBox existingProfiles={profiles} setShow={setShowImport}
                                                 onImport={importProfile} decode={decodeProfile}
                                                 parseRegex={(value) => importPoe2Regex(value, loadSettings(currentProfile), location.pathname)}
                                                 onImportRegex={handleImportRegex}
                                                 expectedGame="poe2" profileType="PoE2 profile" />}
      </div>
    </div>
  );
};

export default Poe2ProfileSelector;
