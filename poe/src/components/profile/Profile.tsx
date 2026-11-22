import "@shared/components/profile/Profile.css";
import React, {createContext, useContext, useEffect, useState} from "react";
import ProfileEditBox from "@shared/components/profile/ProfileEditBox";
import {
  deleteProfile,
  loadProfileNames, loadSettings,
  saveSettings,
  selectedProfile,
  setSelectedProfile
} from "../../utils/LocalStorage";
import {defaultSettings, SavedSettings} from "../../utils/SavedSettings";
import {ProfileContext} from "./ProfileContext";
import {GGPKLanguage, GGPKLanguageData} from "../../utils/Languages";
import ProfileExportBox from "@shared/components/profile/ProfileExportBox";
import ProfileImportBox from "@shared/components/profile/ProfileImportBox";
import {decodeProfile, encodeProfile} from "./ProfileTransfer";
import {migrateProfile} from "../../migration/migrations";
import LeagueSelect from "@shared/components/LeagueSelect";
import {useLocation, useNavigate} from "react-router-dom";
import type {Language} from "@shared/typedefs/Language";
import {importPoe1Regex} from "../../utils/regex/ImportRegex";
import type {RegexImportCandidate} from "@shared/core/regex/ParseRegex";

interface ProfileProps {
  languageSelect?: boolean
}


const Profile = (props: ProfileProps) => {
  const {languageSelect} = props;
  const {setGlobalProfile, lang, setLang, reloadProfile} = useContext(ProfileContext);
  const [profiles, setProfiles] = useState(loadProfileNames());
  const [profile, setProfile] = useState(selectedProfile());
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editName, setEditName] = useState("");
  const [copyCurrentProfile, setCopyCurrentProfile] = useState(false);
  const [warning, setWarning] = useState<string | undefined>(undefined);
  const location = useLocation();
  const navigate = useNavigate();

  const selectProfile = (nextProfile: string) => {
    if (location.search.includes("favorite=") && !window.confirm("Discard changes to this favorite and switch profiles?")) return;
    if (location.search.includes("favorite=")) navigate("/favorites");
    setProfile(nextProfile);
  };

  useEffect(() => {
    const handleEsc = (event: any) => {
      if (event.key === 'Escape') {
        setShowNew(false);
        setShowDelete(false);
        setShowEdit(false);
        setShowExport(false);
        setShowImport(false);
      }
      if (event.key === 'Enter') {
        if (showNew) confirmAdd();
        if (showEdit) confirmEdit();
        if (showDelete) confirmDelete();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [editName, showNew, showEdit, showDelete]);

  useEffect(() => {
    if (profiles.includes(editName) && (showEdit || showNew)) {
      setWarning("Profile with that name already exists");
    } else if (editName === "" && (showEdit || showNew)) {
      setWarning("Enter profile name");
    } else if (profiles.length === 1 && showDelete) {
      setWarning("Cannot delete last profile");
    } else {
      setWarning(undefined);
    }
  }, [editName, showEdit, showNew, showDelete, profiles]);

  useEffect(() => {
    setSelectedProfile(profile);
    setGlobalProfile(profile);
    setLang(loadSettings(profile).language);
  }, [setGlobalProfile, profile]);

  useEffect(() => {
    const profileSettings = loadSettings(profile);
    saveSettings({...profileSettings, language: lang});
    setSelectedProfile(profile);
  }, [lang]);

  const confirmAdd = () => {
    console.log(`Adding new profile: ${editName}`)
    setProfiles(profiles.concat(editName));
    setProfile(editName);
    const newProfile = copyCurrentProfile ? loadSettings(profile) : {...defaultSettings};
    newProfile.name = editName;
    saveSettings(newProfile);
    setShowNew(false);
  }

  const confirmEdit = () => {
    console.log(`Renaming profile: ${profile} -> ${editName}`)
    const oldProfile = profile;
    const profileSettings = loadSettings(oldProfile);
    saveSettings({...profileSettings, name: editName});
    setProfiles(profiles.filter((e) => e !== profile).concat(editName));
    setProfile(editName);
    deleteProfile(oldProfile);
    setShowEdit(false);
  }

  const confirmDelete = () => {
    const newProfiles = profiles.filter((e) => e !== profile);
    setProfiles(newProfiles);
    setProfile(newProfiles[0]);
    deleteProfile(profile);
    setShowDelete(false);
  }

  const handleImportProfile = (importedSettings: SavedSettings) => {
    // If the migration fails, the profile is saved on its old version and migrated on the next visit
    migrateProfile(importedSettings).catch(() => importedSettings).then((migrated) => {
      console.log(`Saving profile: ${migrated.name}`);

      if (!profiles.includes(migrated.name)) {
        setProfiles(profiles.concat(migrated.name));
      }

      setProfile(migrated.name);
      saveSettings(migrated);
      reloadProfile?.();
      setShowImport(false);
    });
  };

  const handleImportRegex = (candidate: RegexImportCandidate<SavedSettings>) => {
    saveSettings({...candidate.settings, name: profile});
    setSelectedProfile(profile);
    reloadProfile?.();
    setShowImport(false);
    navigate(candidate.route);
  };

  return (
    <div className="profile-container">
      <div>League:</div>
      <LeagueSelect/>
      <div className="profile-label">Profile:</div>
      <select name="profile" className="dropdown-select dropdown-md" value={profile}
              onChange={(e) => selectProfile(e.target.value)}>
        {profiles.map((profile) => {
          return <option className="option-league" key={profile} value={profile}>{profile}</option>;
        })};
      </select>
      <div className="profile-actions">
        <div className="profile-icon profile-icon-large" onClick={() => {
          setShowEdit(false);
          setShowDelete(false);
          setEditName("");
          setCopyCurrentProfile(false);
          setShowNew(true);
        }}>+
        </div>
        <div className="profile-icon" onClick={() => {
          setShowDelete(false);
          setShowNew(false);
          setEditName(profile);
          setShowEdit(true);
        }}>✎
        </div>
        <div className="profile-icon" onClick={() => {
          setShowNew(false);
          setShowEdit(false);
          setShowDelete(true);
        }}>✕
        </div>

        {showNew &&
          <ProfileEditBox
            header={"Create new profile"}
            editValue={editName}
            setEditValue={setEditName}
            show={setShowNew}
            confirm={confirmAdd}
            warning={warning}
            copyCurrentProfile={copyCurrentProfile}
            setCopyCurrentProfile={setCopyCurrentProfile}
          />
        }
        {showEdit &&
          <ProfileEditBox
            header={"Edit profile name"}
            editValue={editName}
            setEditValue={setEditName}
            show={setShowEdit}
            confirm={confirmEdit}
            warning={warning}
          />
        }
        {showDelete &&
          <ProfileEditBox
            header={`Delete profile`}
            editValue={""}
            show={setShowDelete}
            confirm={confirmDelete}
            warning={warning}
            saveText={"Confirm"}
          />
        }
      </div>
      <select
        name="language"
        className="dropdown-select dropdown-sm"
        value={languageSelect ? lang : "ENGLISH"}
        disabled={!languageSelect}
        onChange={(e) => setLang(e.target.value as Language)}
      >
        {Object.entries(GGPKLanguage).map(([key, data]) => (
          <option
            className="option-language"
            key={key}
            value={key}
          >
            {data.flag} {data.name}
          </option>
        ))}
      </select>
      <div className="profile-actions">
        <button className="export-button" onClick={() => {
          setShowImport(false);
          setShowExport(true);
        }}>Export</button>
        <button className="import-button" onClick={() => {
          setShowExport(false);
          setShowImport(true);
        }}>Import</button>

        {showExport &&
          <ProfileExportBox settings={loadSettings(profile)} setShow={setShowExport} encode={encodeProfile} />
        }
        {showImport &&
          <ProfileImportBox setShow={setShowImport} existingProfiles={profiles} onImport={handleImportProfile}
                            decode={decodeProfile} expectedGame="poe"
                            parseRegex={(value) => importPoe1Regex(value, loadSettings(profile), location.pathname)}
                            onImportRegex={handleImportRegex}
                            metadata={(settings) => [
                              {label: "Name", value: settings.name},
                              {label: "Language", value: settings.language || "Not specified"},
                              {label: "Selected map mods", value: settings.map.goodIds.length + settings.map.badIds.length},
                              {label: "Schema version", value: settings.version || "Not specified"},
                            ]} />
        }
      </div>

    </div>
  )
}

export default Profile;
