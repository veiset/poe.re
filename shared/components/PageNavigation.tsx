import {useLocation} from "react-router-dom";
import coffeeIcon from "@shared/img/bmc-logo-no-background.png";
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

const SupportLink = ({href, icon, text}: {href: string; icon: string; text: string}) => (
  <p className="support-link">
    <img src={icon} alt="" className="support-icon"/>
    <a className="source-link" href={href} rel="noreferrer">{text}</a>
  </p>
);

export const PageNavigation = ({title, otherGameLabel, otherGameUrl, statsUrl, items}: PageNavigationProps) => {
  const currentPage = useLocation().pathname;

  return (
    <div className="page-link-wrapper">
      <div className="page-link-header">{title}</div>
      <div className="page-links">
        <p className="poe2-link">
          <a className="source-link" href={otherGameUrl}>{otherGameLabel}</a>
        </p>
        {items.map((item) => <PageLink key={item.route} {...item} currentPage={currentPage}/>)}
        <p/>
        <SupportLink href={getBugReportUrl()} icon={githubIcon} text="Report issue"/>
        <SupportLink href="https://www.buymeacoffee.com/veiset" icon={coffeeIcon} text="Buy me a coffee"/>
        <SupportLink href={statsUrl} icon={plausibleIcon} text="Website stats"/>
      </div>
    </div>
  );
};
