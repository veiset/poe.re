import React from "react";

interface ProfileEditBoxProps {
  header: string
  editValue: string
  setEditValue?: (n: string) => void
  show: (s: boolean) => void
  confirm: () => void
  warning: string | undefined
  saveText?: string | undefined
  copyCurrentProfile?: boolean
  setCopyCurrentProfile?: (copy: boolean) => void
}

const ProfileEditBox = (props: ProfileEditBoxProps) => {
  const {
    header,
    editValue,
    setEditValue,
    show,
    confirm,
    warning,
    saveText,
    copyCurrentProfile,
    setCopyCurrentProfile,
  } = props;

  return (
    <div className="new-profile-box">
      <div className="profile-header">{header}</div>
      {setEditValue && <div className="profile-input-area">
          <form>
              Profile name:
              <input type="text"
                     autoFocus={true}
                     value={editValue}
                     onChange={(e) => setEditValue(e.target.value)}
              />
          </form>
      </div>
      }
      {setCopyCurrentProfile && <label className="profile-copy-option">
        <input
          type="checkbox"
          checked={copyCurrentProfile ?? false}
          onChange={(e) => setCopyCurrentProfile(e.target.checked)}
        />
        Duplicate current settings
      </label>}
      <div className="profile-button-area">
        <button className="copy-button" disabled={!!warning} onClick={() => {
          confirm()
        }}> {saveText ?? "Save"}
        </button>
        <button className="reset-button" onClick={() => {
          show(false);
        }}> Cancel
        </button>
        {warning && <div className="profile-warning">{warning}</div>}
      </div>
    </div>
  )
}


export default ProfileEditBox;
