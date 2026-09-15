import {useEffect, useState} from "react";
import {useLocation} from "react-router-dom";
import discordIcon from "@shared/img/discord.svg";
import coffeeIcon from "@shared/img/bmc-logo.svg";
import githubIcon from "@shared/img/github-mark-white.png";
import plausibleIcon from "@shared/img/plausible_logo_sm.png";
import "@shared/styles/PageLinks.css";
import {PageLink} from "./PageLink";
import {getBugReportUrl} from "@shared/core/issueTracker";

export interface NavigationItem {
  text: string;
  icon: string;
  route: string;
}

interface PageNavigationProps {
  title: string;
  otherGameLabel: string;
  otherGameUrl: string;
  statsUrl: string;
  items: NavigationItem[];
}

const SupportLink = ({href, icon, text, className = ""}: {href: string; icon: string; text: string; className?: string}) => (
  <p className="support-link">
    <a className="source-link support-link-anchor" href={href} target="_blank" rel="noopener noreferrer">
      <img src={icon} alt="" className={`support-icon ${className}`} decoding="async" loading="lazy"/>
      {text}
    </a>
  </p>
);

export const PageNavigation = ({title, otherGameLabel, otherGameUrl, statsUrl, items}: PageNavigationProps) => {
  const currentPage = useLocation().pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [currentPage]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const closeAtDesktopWidth = () => {
      if (window.innerWidth > 700) setMobileOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeAtDesktopWidth);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeAtDesktopWidth);
    };
  }, [mobileOpen]);

  return (
    <>
      <button
        type="button"
        className="mobile-navigation-toggle"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        aria-controls="primary-navigation"
        onClick={() => setMobileOpen(true)}
      >
        <span className="mobile-navigation-icon" aria-hidden="true">☰</span>
        <span>{title}</span>
      </button>
      <button
        type="button"
        className={`mobile-navigation-backdrop${mobileOpen ? " mobile-navigation-backdrop-open" : ""}`}
        aria-label="Close navigation"
        tabIndex={mobileOpen ? 0 : -1}
        onClick={() => setMobileOpen(false)}
      />
      <nav
        id="primary-navigation"
        className={`page-link-wrapper${mobileOpen ? " page-link-wrapper-open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="page-link-header">
          <span>{title}</span>
          <button type="button" className="mobile-navigation-close" aria-label="Close navigation"
                  onClick={() => setMobileOpen(false)}>×</button>
        </div>
        <div className="page-links">
          <p className="poe2-link">
            <a className="source-link" href={otherGameUrl}>{otherGameLabel}</a>
          </p>
          {items.map((item) => <PageLink key={item.route} {...item} currentPage={currentPage}/>)}
          <p/>
          <SupportLink href="https://discord.gg/T8BzKnatY6" icon={discordIcon} text="Join us on Discord" className="support-icon-discord"/>
          <SupportLink href={getBugReportUrl()} icon={githubIcon} text="Report issue"/>
          <SupportLink href="https://www.buymeacoffee.com/veiset" icon={coffeeIcon} text="Buy me a coffee" className="support-icon-coffee"/>
          <SupportLink href={statsUrl} icon={plausibleIcon} text="Website stats"/>
        </div>
      </nav>
    </>
  );
};
