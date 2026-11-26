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
import {defaultSettings} from "../../utils/SavedSettings";
import {ProfileContext} from "./ProfileContext";
import {GGPKLanguage, GGPKLanguageData} from "../../utils/Languages";
import ShareDialog from "./ShareDialog";
import LeagueSelect from "@shared/components/LeagueSelect";
import {useLocation, useNavigate} from "react-router-dom";
import type {Language} from "@shared/typedefs/Language";

interface ProfileProps {
  languageSelect?: boolean
}


const Profile = (props: ProfileProps) => {
  const {languageSelect} = props;
  const {setGlobalProfile, lang, setLang} = useContext(ProfileContext);
  const [profiles, setProfiles] = useState(loadProfileNames());
  const [profile, setProfile] = useState(selectedProfile());
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showShare, setShowShare] = useState(false);
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
        setShowShare(false);
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
        <button className="import-button" onClick={() => setShowShare(true)}>Share</button>
        {showShare && <ShareDialog settings={loadSettings(profile)} onClose={() => setShowShare(false)}/>}
      </div>

    </div>
  )
}

export default Profile;
