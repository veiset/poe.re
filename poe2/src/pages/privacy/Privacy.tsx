import "./Privacy.css";

const LAST_UPDATED = "16 September 2026";

export function Privacy() {
  return (
    <div className="privacy-page">
      <h1>Privacy policy</h1>
      <p className="privacy-updated">Last updated: {LAST_UPDATED}</p>

      <p>
        poe2.re is a free tool that generates search strings for Path of Exile 2. It has no
        accounts and no login. This policy explains what is collected when you use the site and
        the choices you have.
      </p>

      <h2>Stored on your device</h2>
      <p>
        Your profiles, favorites and page settings are saved in your browser's local storage.
        They stay on your device, are never sent to us, and are removed if you clear your
        browser data for this site.
      </p>

      <h2>Advertising</h2>
      <p>
        Advertising on this site is served by NitroPay and its ad exchange partners. To sell and
        measure those ads, these third parties may store and access cookies or similar device
        identifiers and process your IP address, approximate location, device and browser
        details, and the ads you were shown or interacted with. Some partners use this to
        personalise the ads you see.
      </p>
      <p>
        NitroPay acts as our advertising partner and is the source of the consent controls in the footer.
        Their own policy is available at{" "}
        <a href="https://nitropay.com/privacy" target="_blank" rel="noopener noreferrer">nitropay.com/privacy</a>.
      </p>

      <h2>Your privacy choices</h2>
      <p>
        The footer at the bottom of every page carries the controls to opt out of the sale or
        sharing of your personal information and to change the consent you previously gave. They
        appear only where the relevant law applies to you, so you may see one, both, or neither
        &mdash; and neither will load while an ad blocker is active.
      </p>

      <h2>California and other US state privacy rights</h2>
      <p>
        If you are a California resident, the CCPA/CPRA gives you the right to know what personal
        information is collected about you, to request that it be deleted or corrected, to opt
        out of its sale or sharing, and not to be discriminated against for exercising those
        rights. Residents of other US states with comparable laws have similar rights.
      </p>
      <p>
        We do not sell personal information for money. Sharing personal information with
        advertising partners for cross-context behavioural advertising does count as a "sale" or
        "share" under those laws, and the "Do Not Sell or Share My Personal Information" control
        in the footer opts you out of it. Because the site has no accounts, we hold no personal
        information of our own to disclose or delete; the categories described above are
        collected and held by our advertising partners.
      </p>

      <h2>European and UK privacy rights</h2>
      <p>
        If you are in the EEA, the UK or Switzerland, advertising cookies and identifiers are
        only used after you consent through the consent dialog shown on your first visit. You can
        withdraw or change that consent at any time using the control in the footer. You also have the
        right to access, correct, delete or restrict the processing of your personal data, and to
        complain to your local data protection authority.
      </p>

      <h2>Links to other sites</h2>
      <p>
        The site links out to the official Path of Exile trade site, GitHub, Discord and Buy Me a
        Coffee, and embeds the Buy Me a Coffee widget. Those services have their own privacy
        policies and this one does not cover them.
      </p>

      <h2>Children</h2>
      <p>
        The site is not directed at children under 13, and we do not knowingly collect personal
        information from them.
      </p>

      <h2>Changes</h2>
      <p>
        This policy may be updated as the site changes. The date at the top always reflects the
        current version.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be raised on our{" "}
        <a href="https://discord.gg/T8BzKnatY6" target="_blank" rel="noopener noreferrer">Discord server</a>{" "}
        or as an issue on{" "}
        <a href="https://github.com/veiset/poe.re/issues" target="_blank" rel="noopener noreferrer">GitHub</a>.
      </p>
    </div>
  );
}

export default Privacy;
