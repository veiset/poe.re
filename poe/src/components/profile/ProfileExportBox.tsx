import React, { useMemo, useState } from "react";
import { SavedSettings } from "../../utils/SavedSettings";
import {encodeProfile} from "./ProfileTransfer";

interface ProfileExportBoxProps {
  settings: SavedSettings;
  setShow: (n: boolean) => void;
}

const ProfileExportBox = (props: ProfileExportBoxProps) => {
  const { settings, setShow } = props;
  const [copied, setCopied] = useState(false);

  // Serialize the profile object to a Base64 string
  const base64Profile = useMemo(() => {
    try {
      return encodeProfile(settings);
    } catch (e) {
      console.error("Failed to serialize profile", e);
      return "Error generating export string.";
    }
  }, [settings]);

  const handleCopy = () => {
    navigator.clipboard.writeText(base64Profile).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="new-profile-box export-profile-box">
      <div className="profile-header">⍐ Export profile: {settings.name}</div>

      <div className="profile-input-area">
        <p style={{ margin: "0 0 8px 0", fontSize: "0.9em", opacity: 0.8 }}>
          Copy this string to export your profile:
        </p>
        <textarea
          readOnly
          value={base64Profile}
          rows={5}
          style={{ width: "98%", height: "120px", resize: "vertical", fontFamily: "monospace" }}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
      </div>

      <div className="profile-button-area">
        <button className="import-button" onClick={handleCopy}>
          {copied ? "Copied✓" : "Copy"}
        </button>
        <button
          className="import-button"
          style={{ backgroundColor: "#444e5b" }}
          onClick={() => setShow(false)}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ProfileExportBox;
