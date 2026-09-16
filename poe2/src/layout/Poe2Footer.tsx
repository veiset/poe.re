import {Link} from "react-router-dom";
import NitroConsentLinks from "@shared/components/privacy/NitroConsentLinks";
import "./Poe2Footer.css";

// Rendered on every page, which is what NitroPay asks for: the CCPA opt-out has
// to be reachable from the home page as well as the privacy policy.
export const Poe2Footer = () => (
  <footer className="site-footer">
    <Link className="site-footer-link" to="/privacy">Privacy policy</Link>
    <NitroConsentLinks/>
  </footer>
);

export default Poe2Footer;
