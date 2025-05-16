import React, { useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import { Button } from "@mui/material";
import MultipleStopIcon from "@mui/icons-material/MultipleStop";
import LockIcon from "@mui/icons-material/Lock";
import LayersIcon from "@mui/icons-material/Layers";
import ShieldIcon from "@mui/icons-material/Shield";
import DevicesIcon from "@mui/icons-material/Devices";
import StorageIcon from "@mui/icons-material/Storage";
import { Link, useLocation } from "react-router-dom";
import Logo from "../../public/images/landing/logo_mark.webp";
import { useStyles } from "./LandingPage.styles";

const LandingPage = () => {
  const classes = useStyles();
  const contentSectionRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.hash === "#content" && contentSectionRef.current) {
      const yOffset = -80;
      const y =
        contentSectionRef.current.getBoundingClientRect().top +
        window.pageYOffset +
        yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [location]);

  const scrollToContent = (e: React.MouseEvent) => {
    e.preventDefault();
    contentSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section className={classes.heroSection}>
        <h1 className={classes.title}>
          Secure your bitcoin with <span className="highlight">Caravan</span>, a
          fully open-source stateless multisig coordinator
        </h1>
        <h2 className={classes.subtitle}>
          Caravan simplifies multisig custody by coordinating your transactions
          without storing your keys. Self-custody your bitcoin with enhanced
          security, privacy, and protection against single points of failure.
        </h2>
        <div className={classes.buttonContainer}>
          <Link to="/setup">
            <Button
              className={classes.ctaButton}
              variant="contained"
              aria-label="Get started with Caravan"
            >
              Get started
            </Button>
          </Link>
          <Button
            className={classes.secondaryButton}
            variant="contained"
            onClick={scrollToContent}
            aria-label="Learn more about Caravan"
          >
            Learn more
          </Button>
        </div>
        <img
          src="/images/landing/caravan-balance.webp"
          alt="Caravan Balance Interface"
          className={classes.mainImage}
          loading="lazy"
        />

        <div className={classes.compatibilitySection}>
          <h2 className={classes.compatibilityTitle}>
            Compatible with your favorite tools
          </h2>
          <p className={classes.compatibilityDescription}>
            Caravan works seamlessly with industry-leading hardware wallets,
            browsers, and other bitcoin coordination tools.
          </p>

          <div className={classes.compatibilityGrid}>
            <div className={classes.compatibilityCard}>
              <h3 className={classes.cardTitle}>Hardware wallet support</h3>
              <div className={classes.cardLogos}>
                <img
                  src="/images/landing/trezor.webp"
                  alt="Trezor Hardware Wallet"
                  className={classes.cardLogo}
                  loading="lazy"
                />
                <img
                  src="/images/landing/ledger.webp"
                  alt="Ledger Hardware Wallet"
                  className={classes.cardLogo}
                  loading="lazy"
                />
                <img
                  src="/images/landing/coldcard.webp"
                  alt="Coldcard Hardware Wallet"
                  className={classes.cardLogo}
                  loading="lazy"
                />
                <img
                  src="/images/landing/bitbox.webp"
                  alt="Bitbox Hardware Wallet"
                  className={classes.cardLogo}
                  loading="lazy"
                />
              </div>
            </div>

            <div className={classes.compatibilityCard}>
              <h3 className={classes.cardTitle}>Browser compatibility</h3>
              <div className={classes.cardLogos}>
                <img
                  src="/images/landing/firefox.webp"
                  alt="Firefox Browser"
                  className={classes.cardLogo}
                  loading="lazy"
                />
                <img
                  src="/images/landing/chrome.webp"
                  alt="Chrome Browser"
                  className={classes.cardLogo}
                  loading="lazy"
                />
                <img
                  src="/images/landing/brave.webp"
                  alt="Brave Browser"
                  className={classes.cardLogo}
                  loading="lazy"
                />
              </div>
            </div>

            <div className={classes.compatibilityCard}>
              <h3 className={classes.cardTitle}>Interoperable coordinators</h3>
              <div className={classes.cardLogos}>
                <img
                  src="/images/landing/unchained.webp"
                  alt="Unchained"
                  className={classes.cardLogo}
                  loading="lazy"
                />
                <img
                  src="/images/landing/sparrow.webp"
                  alt="Sparrow Wallet"
                  className={classes.cardLogo}
                  loading="lazy"
                />
                <img
                  src="/images/landing/bitcoin_core.webp"
                  alt="Bitcoin Core"
                  className={classes.cardLogo}
                  loading="lazy"
                />
                <img
                  src="/images/landing/electrum.webp"
                  alt="Electrum Wallet"
                  className={classes.cardLogo}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={classes.contentSection}
        ref={contentSectionRef}
        id="about"
      >
        <div className={classes.fullWidthBox}>
          <div className={classes.descriptionSection}>
            <h3 className={classes.contentTitle}>
              Stateless multisig coordinator
            </h3>
            <p className={classes.contentDescription}>
              Caravan makes bitcoin multisig custody easier and safer through
              transparency and standards. Create common setups like 2-of-3 or
              3-of-5 multisig wallets for different security needs. Caravan
              supports both wallet coordination derived from xpubs and
              individual multisig addresses derived from pubkeys. Being fully
              open-source and stateless, Caravan stores no data outside your
              current browser session, giving you complete control over your
              funds while protecting your privacy.
            </p>
          </div>
          <div className={classes.imageSection}>
            <div className={classes.responsiveImage}>
              <img
                src="/images/landing/stateless.webp"
                alt="Stateless Architecture Diagram"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className={classes.fullWidthBox}>
          <div className={classes.imageSection}>
            <div className={classes.responsiveImage}>
              <img
                src="/images/landing/xpubs.webp"
                alt="XPubs Key Management"
                loading="lazy"
              />
            </div>
          </div>
          <div className={classes.descriptionSection}>
            <h3 className={classes.contentTitle}>Keys & recovery</h3>
            <p className={classes.contentDescription}>
              All bitcoin is ultimately protected by private keys. Your private
              key may live on a piece of paper, a hardware wallet, some software
              on a laptop, or even just in your mind. Caravan, being stateless,
              does not store or ask for your private key but it can talk to
              hardware devices which do. With multisig, you&apos;re protected
              against the loss of any single key, creating a robust disaster
              recovery setup. Caravan supports P2SH, P2WSH, and P2TR address
              formats, and works with all major hardware wallets and key
              management systems.
            </p>
          </div>
        </div>

        <div className={classes.fullWidthBox}>
          <div className={classes.descriptionSection}>
            <h3 className={classes.contentTitle}>Privacy & consensus</h3>
            <p className={classes.contentDescription}>
              In order to look up wallet addresses and their balances, and
              broadcast transactions, Caravan requires knowledge of the
              constantly changing bitcoin network. Running a full bitcoin node
              is the most private way to determine the current state of the
              bitcoin network and prevents third-party services from tracking
              your wallet activity. Caravan can be easily configured to use your
              own node for consensus information and broadcasting transactions.
              If you don&apos;t want to or cannot run your own full node,
              Caravan defaults to using the freely available API at
              mempool.space.
            </p>
          </div>
          <div className={classes.imageSection}>
            <div className={classes.responsiveImage}>
              <img
                src="/images/landing/consensus.webp"
                alt="Consensus Network Diagram"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <section className={classes.featuresSection} id="features">
        <h2>Secure your bitcoin with confidence</h2>
        <h4>Powerful benefits for secure multisig management</h4>
        <div className={classes.featureContainer}>
          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <LockIcon fontSize="large" aria-hidden="true" />
            </div>
            <h3 className={classes.featureTitle}>Security</h3>
            <p className={classes.featureDescription}>
              Minimize attack vectors with Caravan&apos;s stateless design and
              multisig coordination. Protect against exchange failures, theft,
              and single points of compromise.
            </p>
          </div>

          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <LayersIcon fontSize="large" aria-hidden="true" />
            </div>
            <h3 className={classes.featureTitle}>Transparency</h3>
            <p className={classes.featureDescription}>
              Maintain complete control over your private keys with open
              standards and user-managed key storage. As a fully open-source
              solution, the code can be verified by anyone.
            </p>
          </div>

          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <MultipleStopIcon fontSize="large" aria-hidden="true" />
            </div>
            <h3 className={classes.featureTitle}>Flexibility</h3>
            <p className={classes.featureDescription}>
              Import and export wallet configurations or descriptors compatible
              with popular software like Unchained, Sparrow, and Electrum.
              Connect to your own bitcoin node for maximum sovereignty or use
              lightweight options like mempool.space and Blockstream for
              convenient access anywhere.
            </p>
          </div>
        </div>

        <div className={classes.featureContainer}>
          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <ShieldIcon fontSize="large" aria-hidden="true" />
            </div>
            <h3 className={classes.featureTitle}>Advanced features</h3>
            <p className={classes.featureDescription}>
              Support for blinded xpubs to enhance privacy, PSBTv2
              compatibility, and descriptors for advanced configurations. All
              backed by industry-standard BIP implementations.
            </p>
          </div>

          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <DevicesIcon fontSize="large" aria-hidden="true" />
            </div>
            <h3 className={classes.featureTitle}>Hardware support</h3>
            <p className={classes.featureDescription}>
              Seamless integration with industry-leading hardware wallets
              including Ledger, Trezor, Coldcard, and Bitbox. Protect your keys
              with dedicated hardware security while using Caravan&apos;s
              coordination capabilities.
            </p>
          </div>

          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <StorageIcon fontSize="large" aria-hidden="true" />
            </div>
            <h3 className={classes.featureTitle}>Self-custody</h3>
            <p className={classes.featureDescription}>
              Take full control of your bitcoin without relying on third-party
              custodians. True financial sovereignty with enhanced security
              through multisig technology.
            </p>
          </div>
        </div>
      </section>

      <section className={classes.ctaSection}>
        <Box
          sx={{
            width: "90%",
            borderRadius: "12px",
            padding: "32px",
            margin: "0 auto",
            backgroundColor: "#1976D2",
            paddingBottom: 10,
            paddingTop: 10,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h1>Take control of your bitcoin. Create a multisig wallet today</h1>
          <p>
            Manage your bitcoin with increased security and control.
            Caravan&apos;s user-friendly interface guides you through creating,
            recovering, and managing multisig wallets. Protect against key loss,
            theft, and exchange insolvency with true self-custody.
          </p>
          <Link to="/setup">
            <Button className={classes.yellowButton} variant="contained">
              Get started
            </Button>
          </Link>
        </Box>
      </section>

      <footer className={classes.footer}>
        <div className={classes.footerColumn}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              margin: "20px 0",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <img
                src={Logo}
                alt="Caravan Logo"
                style={{ width: "120px", height: "auto" }}
              />
              <span
                style={{
                  margin: "0 15px",
                  fontSize: "16px",
                  fontWeight: "300",
                  color: "#000",
                }}
              >
                <span style={{ fontSize: "24px" }}>×</span>
              </span>
              <img
                src="/images/landing/unchained.webp"
                alt="Unchained Logo"
                style={{ width: "180px", height: "auto" }}
              />
            </div>
            <span
              style={{
                fontSize: "14px",
                color: "#000",
                fontWeight: "normal",
              }}
            >
              Created and supported by Unchained
            </span>
          </div>
          <p style={{ alignSelf: "center", color: "gray" }}>
            Multisig made easy. Manage your bitcoin statelessly with Caravan.
          </p>
          <p style={{ alignSelf: "center" }}>
            &copy; Copyright 2025 by Unchained Capital
            <br />
            Released under an MIT license.
          </p>
        </div>
        <div className={classes.footerColumn}>
          <h4 className={classes.footerTitle} style={{ fontWeight: 700 }}>
            Getting started
          </h4>
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={classes.footerLink}
          >
            Home
          </Link>
          <Link to="/" onClick={scrollToContent} className={classes.footerLink}>
            About
          </Link>
          <Link to="/test" className={classes.footerLink}>
            Test suite
          </Link>
        </div>
        <div className={classes.footerColumn}>
          <h4 className={classes.footerTitle} style={{ fontWeight: 700 }}>
            Resources
          </h4>
          <a
            href="https://unchained.com/blog/"
            className={classes.footerLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Read blog posts on Unchained"
          >
            Blog
          </a>
          <a
            href="https://github.com/caravan-bitcoin/caravan/blob/main/apps/coordinator/README.md"
            className={classes.footerLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Read Caravan tutorial"
          >
            Tutorial
          </a>
          <a
            href="https://github.com/caravan-bitcoin/caravan"
            className={classes.footerLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Caravan source code on GitHub"
          >
            Source code
          </a>
          <a
            href="https://bitcoiner.guide/multisig/"
            className={classes.footerLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Learn about Bitcoin multisig"
          >
            Multisig guide
          </a>
        </div>
        <div className={classes.footerColumn}>
          <h4 className={classes.footerTitle} style={{ fontWeight: 700 }}>
            Developer&apos;s corner
          </h4>
          <a
            href="https://github.com/caravan-bitcoin/caravan/issues"
            className={classes.footerLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View GitHub issues for Caravan"
          >
            GitHub
          </a>
          <a
            href="https://github.com/caravan-bitcoin/caravan/blob/main/CONTRIBUTING.md"
            className={classes.footerLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Learn how to contribute to Caravan"
          >
            Contributing
          </a>
        </div>
        <div className={classes.footerColumn}>
          <h4 className={classes.footerTitle} style={{ fontWeight: 700 }}>
            Social
          </h4>
          <a
            href="https://twitter.com/unchainedcom"
            className={classes.footerLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow Unchained Capital on Twitter"
          >
            Twitter
          </a>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
