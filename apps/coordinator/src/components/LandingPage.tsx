import React, { useRef, useEffect } from "react";
import { makeStyles, createStyles } from "@mui/styles";
import Box from "@mui/material/Box";
import { Button } from "@mui/material";
import MultipleStopIcon from "@mui/icons-material/MultipleStop";
import LockIcon from "@mui/icons-material/Lock";
import LayersIcon from "@mui/icons-material/Layers";
import ShieldIcon from "@mui/icons-material/Shield";
import DevicesIcon from "@mui/icons-material/Devices";
import StorageIcon from "@mui/icons-material/Storage";
import { Link, useLocation } from "react-router-dom";
import Logo from "../../../../assets/images/caravan-logo-transparent.png";

const useStyles = makeStyles(() =>
  createStyles({
    heroSection: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      background: "white",
      color: "white",
      textAlign: "center",
      paddingTop: "70px",
      paddingBottom: "70px",
      "& .highlight": {
        color: "#1976d2",
      },
    },
    title: {
      fontSize: "4rem",
      width: "70%",
      margin: 0,
      color: "#333",
      lineHeight: "1.2",
      fontWeight: "600",
      "@media (max-width: 768px)": {
        fontSize: "2.5rem",
        width: "90%",
      },
    },
    subtitle: {
      fontSize: "1.5rem",
      fontWeight: 300,
      width: "60%",
      margin: "30px 0",
      color: "#555",
      lineHeight: "1.5",
      "@media (max-width: 768px)": {
        fontSize: "1.2rem",
        width: "90%",
      },
    },
    ctaButton: {
      backgroundColor: "#1976d2 !important",
      color: "#fff !important",
      padding: "12px 24px !important",
      fontSize: "1.2rem !important",
      borderRadius: "6px !important",
      boxShadow: "0 2px 10px rgba(25, 118, 210, 0.2) !important",
      transition: "all 0.3s ease-in-out !important",
      "&:hover": {
        backgroundColor: "#fff !important",
        color: "#1976d2 !important",
        outline: "#1976d2 solid 1px !important",
        transform: "translateY(-2px) !important",
        boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3) !important",
      },
    },
    secondaryButton: {
      backgroundColor: "#fff !important",
      color: "#1976d2 !important",
      padding: "12px 24px !important",
      fontSize: "1.2rem !important",
      border: "1px solid #1976d2 !important",
      borderRadius: "6px !important",
      transition: "all 0.3s ease-in-out !important",
      "&:hover": {
        backgroundColor: "#1976d2 !important",
        color: "#fff !important",
        transform: "translateY(-2px) !important",
        boxShadow: "0 4px 12px rgba(25, 118, 210, 0.2) !important",
      },
    },
    yellowButton: {
      backgroundColor: "#ea9c0d !important",
      color: "#333 !important",
      padding: "12px 24px !important",
      fontSize: "1.2rem !important",
      borderRadius: "6px !important",
      boxShadow: "0 2px 10px rgba(234, 156, 13, 0.3) !important",
      transition: "all 0.3s ease-in-out !important",
      "&:hover": {
        backgroundColor: "#fff !important",
        color: "#ea9c0d !important",
        border: "1px solid #ea9c0d !important",
        transform: "translateY(-2px) !important",
      },
    },
    contentSection: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      background: "linear-gradient(135deg, #1976d2, #0d47a1)",
      color: "white",
      textAlign: "center",
      padding: "80px 0",
      borderRadius: "10px",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
      margin: "20px 0",
      "& .highlight": {
        color: "#1976d2",
      },
    },
    contentTitle: {
      fontSize: "2.2rem",
      color: "#fff",
      textAlign: "left",
      width: "80%",
      margin: "20px auto",
      fontWeight: "600",
      "@media (max-width: 1200px)": {
        fontSize: "1.5rem",
        width: "90%",
      },
    },
    contentDescription: {
      color: "#fff",
      width: "80%",
      margin: "0 auto",
      textAlign: "left",
      fontSize: "1.5rem",
      lineHeight: "1.6",
      "@media (max-width: 1200px)": {
        fontSize: "1.2rem",
        width: "90%",
      },
    },
    fullWidthBox: {
      display: "flex",
      flexDirection: "row",
      width: "100%",
      marginBottom: "40px",
      "@media (max-width: 1400px)": {
        flexDirection: "column",
      },
    },
    imageSection: {
      flex: 2,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      marginRight: "20px",
      padding: "20px",
      "@media (max-width: 1400px)": {
        marginRight: 0,
        padding: "20px",
        order: 2,
      },
    },
    descriptionSection: {
      flex: 1,
      padding: "20px",
      "@media (max-width: 1400px)": {
        order: 1,
      },
    },
    featuresSection: {
      padding: "100px 0",
      background: "#fff",
      textAlign: "center",
      width: "100%",
      "& h2": {
        fontSize: "2.5rem",
        marginBottom: "10px",
        color: "#333",
      },
      "& h4": {
        fontSize: "1.2rem",
        marginBottom: "50px",
        color: "#666",
      },
    },
    featureContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      margin: "40px auto",
      gap: "100px",
      maxWidth: "1200px",
      padding: "0 20px",
      "@media (max-width: 768px)": {
        flexDirection: "column",
        margin: "20px auto",
        gap: "40px",
        padding: "0 20px",
      },
    },
    featureItem: {
      flex: 1,
      padding: "30px",
      maxWidth: "350px",
      borderRadius: "8px",
      transition: "transform 0.3s ease, box-shadow 0.3s ease",
      "&:hover": {
        transform: "translateY(-10px)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
      },
      "@media (max-width: 768px)": {
        maxWidth: "100%",
      },
    },
    featureIcon: {
      fontSize: "3rem",
      color: "#1976d2",
      textAlign: "left",
      margin: "0 0 15px 0",
    },
    featureTitle: {
      marginTop: "20px",
      fontSize: "1.5rem",
      color: "#333",
      textAlign: "left",
      fontWeight: "600",
    },
    featureDescription: {
      color: "#666",
      textAlign: "left",
      lineHeight: "1.6",
      marginTop: "10px",
    },
    ctaSection: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      background: "#fff",
      color: "white",
      textAlign: "center",
      padding: "80px 0",
      "& .highlight": {
        color: "#1976d2",
      },
    },
    footer: {
      padding: "60px 0",
      background: "#fff",
      color: "#000",
      textAlign: "left",
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
      gap: "20px",
      borderTop: "1px solid #eee",
      "@media (max-width: 768px)": {
        gridTemplateColumns: "1fr",
        textAlign: "center",
        padding: "40px 20px",
      },
    },
    footerColumn: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
    },
    footerTitle: {
      marginBottom: "15px",
      color: "#333",
      fontWeight: "600",
    },
    footerLink: {
      color: "#555",
      textDecoration: "none",
      marginBottom: "10px",
      transition: "color 0.2s ease",
      "&:hover": {
        color: "#1976d2",
        textDecoration: "none",
      },
    },
    logoButton: {
      backgroundColor: "transparent !important",
      color: "#1976d2 !important",
      padding: "10px 20px !important",
      fontSize: "2rem !important",
      outline: "none !important",
      boxShadow: "none !important",
      fontWeight: "bold !important",
      display: "flex !important",
      alignItems: "center !important",
      minWidth: "fit-content !important",
      "& img": {
        width: "75px !important",
        height: "60px !important",
        marginBottom: "10px !important",
      },
    },
    buttonContainer: {
      display: "flex",
      justifyContent: "space-between",
      width: "400px",
      flexWrap: "wrap",
      margin: "20px 0 30px",
      gap: "15px",
      "@media (max-width: 500px)": {
        width: "100%",
        justifyContent: "center",
      },
    },
    mainImage: {
      marginTop: "80px",
      maxWidth: "50%",
      height: "auto",
      transition: "transform 0.5s ease",
      "&:hover": {
        transform: "scale(1.02)",
      },
      "@media (max-width: 768px)": {
        maxWidth: "90%",
      },
    },
    imageGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: "20px",
      maxWidth: "100%",
      paddingTop: "60px",
      paddingBottom: "20px",
      "@media (max-width: 1024px)": {
        gridTemplateColumns: "repeat(2, 1fr)",
      },
      "@media (max-width: 600px)": {
        gridTemplateColumns: "1fr",
      },
    },
    gridImage: {
      height: "80px",
      width: "auto",
      padding: "10px",
      transition: "transform 0.3s ease",
      "&:hover": {
        transform: "scale(1.1)",
      },
    },
    responsiveImage: {
      backgroundColor: "#FFE7BB",
      padding: "20px",
      borderRadius: "12px",
      width: "100%",
      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.08)",
      transition: "transform 0.3s ease",
      "&:hover": {
        transform: "translateY(-5px)",
      },
      "& img": {
        width: "100%",
        height: "auto",
        maxHeight: "700px",
        minHeight: "500px",
        borderRadius: "10px",
        objectFit: "contain",
        "@media (max-width: 1200px)": {
          maxHeight: "500px",
          minHeight: "350px",
        },
        "@media (max-width: 700px)": {
          maxHeight: "300px",
          minHeight: "200px",
        },
      },
      "@media (max-width: 1400px)": {
        padding: "20px",
      },
    },
  }),
);

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
              Get Started
            </Button>
          </Link>
          <Button
            className={classes.secondaryButton}
            variant="contained"
            onClick={scrollToContent}
            aria-label="Learn more about Caravan"
          >
            Learn More
          </Button>
        </div>
        <img
          src="/images/landing/caravan-balance.png"
          alt="Caravan Balance Interface"
          className={classes.mainImage}
          loading="lazy"
        />
        <div className={classes.imageGrid}>
          <img
            src="/images/landing/trezor.png"
            alt="Trezor Hardware Wallet"
            className={classes.gridImage}
            loading="lazy"
          />
          <img
            src="/images/landing/ledger.png"
            alt="Ledger Hardware Wallet"
            className={classes.gridImage}
            loading="lazy"
          />
          <img
            src="/images/landing/coldcard.png"
            alt="Coldcard Hardware Wallet"
            className={classes.gridImage}
            loading="lazy"
          />
          <img
            src="/images/landing/firefox.png"
            alt="Firefox Browser"
            className={classes.gridImage}
            loading="lazy"
          />
          <img
            src="/images/landing/chrome.png"
            alt="Chrome Browser"
            className={classes.gridImage}
            loading="lazy"
          />
          <img
            src="/images/landing/brave.png"
            alt="Brave Browser"
            className={classes.gridImage}
            loading="lazy"
          />
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
              Stateless Multisig Coordinator
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
                src="/images/landing/stateless.png"
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
                src="/images/landing/xpubs.png"
                alt="XPubs Key Management"
                loading="lazy"
              />
            </div>
          </div>
          <div className={classes.descriptionSection}>
            <h3 className={classes.contentTitle}>Keys & Recovery</h3>
            <p className={classes.contentDescription}>
              All bitcoin is ultimately protected by private keys. Your private
              key may live on a piece of paper, a hardware wallet, some software
              on a laptop, or even just in your mind. Caravan, being stateless,
              does not store or ask for your private key but it can talk to
              hardware devices which do. With multisig, you're protected against
              the loss of any single key, creating a robust disaster recovery
              setup. Caravan supports P2SH, P2WSH, and P2TR address formats, and
              works with all major hardware wallets and key management systems.
            </p>
          </div>
        </div>

        <div className={classes.fullWidthBox}>
          <div className={classes.descriptionSection}>
            <h3 className={classes.contentTitle}>Privacy & Consensus</h3>
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
                src="/images/landing/consensus.png"
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
              Enjoy seamless integration with hardware wallets, software
              applications, and a user-friendly interface for effortless
              multisig management across desktop and compatible mobile browsers.
            </p>
          </div>
        </div>

        <div className={classes.featureContainer}>
          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <ShieldIcon fontSize="large" aria-hidden="true" />
            </div>
            <h3 className={classes.featureTitle}>Advanced Features</h3>
            <p className={classes.featureDescription}>
              Support for blinded xpubs to enhance privacy, BIP174 PSBT
              compatibility, and scriptable descriptors for advanced
              configurations. All backed by industry-standard BIP
              implementations.
            </p>
          </div>

          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <DevicesIcon fontSize="large" aria-hidden="true" />
            </div>
            <h3 className={classes.featureTitle}>Hardware Support</h3>
            <p className={classes.featureDescription}>
              Seamless integration with industry-leading hardware wallets
              including Ledger, Trezor, and Coldcard. Protect your keys with
              dedicated hardware security while using Caravan's coordination
              capabilities.
            </p>
          </div>

          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <StorageIcon fontSize="large" aria-hidden="true" />
            </div>
            <h3 className={classes.featureTitle}>Self-Custody</h3>
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
          <Button
            className={classes.logoButton}
            style={{ textTransform: "none" }}
            variant="contained"
            startIcon={
              <img
                src={Logo}
                alt="Caravan Logo"
                style={{ width: 75, height: 60 }}
              />
            }
          >
            Caravan
          </Button>
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
          <h4 className={classes.footerTitle}>Getting started</h4>
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
          <h4 className={classes.footerTitle}>Resources</h4>
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
            Multisig Guide
          </a>
        </div>
        <div className={classes.footerColumn}>
          <h4 className={classes.footerTitle}>Developer&apos;s corner</h4>
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
          <h4 className={classes.footerTitle}>Social</h4>
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
