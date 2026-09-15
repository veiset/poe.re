import React, {useMemo, useRef, useState} from "react";

export interface NamedProfile {
  name: string;
}

export interface ProfileExportBoxProps<T extends NamedProfile> {
  settings: T;
  setShow: (show: boolean) => void;
  encode: (settings: T) => string;
  onExport?: () => void;
}

export default function ProfileExportBox<T extends NamedProfile>({settings, setShow, encode, onExport}: ProfileExportBoxProps<T>) {
  const [copied, setCopied] = useState(false);
  const exportTracked = useRef(false);
  const exportString = useMemo(() => {
    try {
      return encode(settings);
    } catch (error) {
      console.error("Failed to serialize profile", error);
      return "Error generating export string.";
    }
  }, [encode, settings]);

  const copy = () => navigator.clipboard.writeText(exportString).then(() => {
    if (!exportTracked.current) {
      exportTracked.current = true;
      onExport?.();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });

  return (
    <div className="new-profile-box export-profile-box">
      <div className="profile-header">⍐ Export profile: {settings.name}</div>
      <div className="profile-input-area">
        <p>Copy this string to export your profile:</p>
        <textarea readOnly value={exportString} rows={5}
                  style={{width: "98%", height: "120px", resize: "vertical", fontFamily: "monospace"}}
                  onClick={(event) => event.currentTarget.select()} />
      </div>
      <div className="profile-button-area">
        <button className="import-button" onClick={copy}>{copied ? "Copied✓" : "Copy"}</button>
        <button className="import-button" style={{backgroundColor: "#444e5b"}}
                onClick={() => setShow(false)}>Close</button>
      </div>
    </div>
  );
}
