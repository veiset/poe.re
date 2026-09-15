import "./Header.css";
import { useId, useState } from "react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  text: string;
  children: ReactNode;
}

export const PageHeader = ({ text, children }: PageHeaderProps) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileId = useId();

  return (
    <div className="page-header-container">
      <h1 className="page-header">{text} Regex</h1>
      <button
        type="button"
        className="page-header-profile-toggle"
        aria-expanded={profileOpen}
        aria-controls={profileId}
        onClick={() => setProfileOpen(!profileOpen)}
      >
        Profile <span aria-hidden="true">{profileOpen ? "▴" : "▾"}</span>
      </button>
      <div
        id={profileId}
        className={`page-header-profile${profileOpen ? " page-header-profile-open" : ""}`}
      >
        {children}
      </div>
    </div>
  );
};
