import React, { useRef, useEffect } from "react";
import { makeStyles, createStyles } from "@mui/styles";
import Box from "@mui/material/Box";
import { Button } from "@mui/material";
import MultipleStopIcon from "@mui/icons-material/MultipleStop";
import LockIcon from "@mui/icons-material/Lock";
import LayersIcon from "@mui/icons-material/Layers";
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
      paddingTop: "50px",
      paddingBottom: "50px",
      "& .highlight": {
        color: "#1976d2",
      },
    },
    title: {
      fontSize: "4rem",
      width: "70%",
      margin: 0,
      color: "#333",
      "@media (max-width: 768px)": {
        fontSize: "2.5rem",
        width: "90%",
      },
    },
    subtitle: {
      fontSize: "1.5rem",
      fontWeight: 300,
      width: "60%",
      margin: "20px 0",
      color: "#666",
      "@media (max-width: 768px)": {
        fontSize: "1.2rem",
        width: "90%",
      },
    },
    ctaButton: {
      backgroundColor: "#1976d2 !important",
      color: "#fff !important",
      padding: "10px 20px !important",
      fontSize: "1.2rem !important",
      "&:hover": {
        backgroundColor: "#fff !important",
        color: "#1976d2 !important",
        outline: "#1976d2 solid 1px !important",
      },
    },
    secondaryButton: {
      backgroundColor: "#fff !important",
      color: "#1976d2 !important",
      padding: "10px 20px !important",
      fontSize: "1.2rem !important",
      border: "1px solid #1976d2 !important",
      "&:hover": {
        backgroundColor: "#1976d2 !important",
        color: "#fff !important",
      },
    },
    yellowButton: {
      backgroundColor: "#ea9c0d !important",
      color: "#333 !important",
      padding: "10px 20px !important",
      fontSize: "1.2rem !important",
      "&:hover": {
        backgroundColor: "#fff !important",
        color: "#1976d2 !important",
      },
    },
    contentSection: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      background: "#1976d2",
      color: "white",
      textAlign: "center",
      padding: "80px 0",
      borderRadius: "10px",
      "& .highlight": {
        color: "#1976d2",
      },
    },
    contentTitle: {
      fontSize: "2rem",
      color: "#fff",
      textAlign: "left",
      width: "80%",
      margin: "20px auto",
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
      "@media (max-width: 1200px)": {
        fontSize: "1.2rem",
        width: "90%",
      },
    },
    fullWidthBox: {
      display: "flex",
      flexDirection: "row",
      width: "100%",
      marginBottom: "20px",
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
      padding: "10px",
      "@media (max-width: 1400px)": {
        order: 1,
      },
    },
    featuresSection: {
      padding: "80px 0",
      background: "#fff",
      textAlign: "center",
      width: "100%",
    },
    featureContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
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
      padding: "20px",
      maxWidth: "350px",
      "@media (max-width: 768px)": {
        maxWidth: "100%",
      },
    },
    featureIcon: {
      fontSize: "3rem",
      color: "#1976d2",
      textAlign: "left",
    },
    featureTitle: {
      marginTop: "20px",
      fontSize: "1.5rem",
      color: "#333",
      textAlign: "left",
    },
    featureDescription: {
      color: "#666",
      textAlign: "left",
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
      padding: "40px 0",
      background: "#fff",
      color: "#000",
      textAlign: "left",
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
      gap: "20px",
      "@media (max-width: 768px)": {
        gridTemplateColumns: "1fr",
        textAlign: "center",
      },
    },
    footerColumn: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
    },
    footerTitle: {
      marginBottom: "10px",
      color: "#000",
    },
    footerLink: {
      color: "#000",
      textDecoration: "none",
      marginBottom: "5px",
      "&:hover": {
        textDecoration: "underline",
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
    },
    mainImage: {
      marginTop: "100px",
      maxWidth: "50%",
      height: "auto",
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
    },
    responsiveImage: {
      backgroundColor: "#FFE7BB",
      padding: "20px",
      borderRadius: "10px",
      width: "100%",
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
      const yOffset = -80; // Adjust this value to account for any fixed headers
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
          stateless multisig coordinator
        </h1>
        <h2 className={classes.subtitle}>
          Caravan simplifies multisig custody by coordinating your transaction
          without storing your keys. Gain security and control over your
          bitcoin.
        </h2>
        <div className={classes.buttonContainer}>
          <Link to="/setup">
            <Button className={classes.ctaButton} variant="contained">
              Get Started
            </Button>
          </Link>
          <Button
            className={classes.secondaryButton}
            variant="contained"
            onClick={scrollToContent}
          >
            Learn More
          </Button>
        </div>
        <img
          src="src/images/landing/caravan-balance.png"
          alt="Caravan Balance"
          className={classes.mainImage}
        />
        <div className={classes.imageGrid}>
          <img
            src="src/images/landing/trezor.png"
            alt="Trezor"
            className={classes.gridImage}
          />
          <img
            src="src/images/landing/ledger.png"
            alt="Ledger"
            className={classes.gridImage}
          />
          <img
            src="src/images/landing/coldcard.png"
            alt="Coldcard"
            className={classes.gridImage}
          />
          <img
            src="src/images/landing/firefox.png"
            alt="Firefox"
            className={classes.gridImage}
          />
          <img
            src="src/images/landing/chrome.png"
            alt="Chrome"
            className={classes.gridImage}
          />
        </div>
      </section>

      <section className={classes.contentSection} ref={contentSectionRef}>
        <div className={classes.fullWidthBox}>
          <div className={classes.descriptionSection}>
            <h3 className={classes.contentTitle}>
              Stateless Multisig Coordinator
            </h3>
            <p className={classes.contentDescription}>
              Caravan makes bitcoin multisig custody easier and safer through
              transparency and standards. Caravan is a coordination software for
              multisig addresses and wallets. Caravan can be used to build a
              multisig wallet derived from xpubs, or individual multisig
              addresses derived from pubkeys. In both cases, in order to
              transact from the wallet or address, you must also have your
              private keys and BIP32 paths. Caravan is stateless. It does not
              itself store any data outside your current browser session. You
              must safekeep the wallet details (xpubs, BIP32 paths) and
              addresses (redeem scripts, BIP32 paths) that you create.
            </p>
          </div>
          <div className={classes.imageSection}>
            <div className={classes.responsiveImage}>
              <img
                src="src/images/landing/stateless.png"
                alt="Stateless Architecture"
              />
            </div>
          </div>
        </div>

        <div className={classes.fullWidthBox}>
          <div className={classes.imageSection}>
            <div className={classes.responsiveImage}>
              <img src="src/images/landing/xpubs.png" alt="XPubs" />
            </div>
          </div>
          <div className={classes.descriptionSection}>
            <h3 className={classes.contentTitle}>Keys</h3>
            <p className={classes.contentDescription}>
              All bitcoin is ultimately protected by private keys. Your private
              key may live on a piece of paper, a hardware wallet, some software
              on a laptop, or even just in your mind. Caravan, being stateless,
              does not store or ask for your private key but it can talk to
              hardware devices or software applications which do. Caravan
              supports entering public keys and signatures via text, so any
              wallet which can export such data can be made compatible with
              Caravan.
            </p>
          </div>
        </div>

        <div className={classes.fullWidthBox}>
          <div className={classes.descriptionSection}>
            <h3 className={classes.contentTitle}>Consensus</h3>
            <p className={classes.contentDescription}>
              In order to look up wallet addresses and their balances, and
              broadcast transactions, Caravan requires knowledge of the
              constantly changing bitcoin network. Running a full bitcoin node
              is the most private way to determine the current state of the
              bitcoin network. Caravan can be easily configured to use your own
              node for consensus information and broadcasting transactions. If
              you don&apos;t want to or cannot run your own full node, Caravan
              defaults to using the freely available API at mempool.space.
            </p>
          </div>
          <div className={classes.imageSection}>
            <div className={classes.responsiveImage}>
              <img src="src/images/landing/consensus.png" alt="Consensus" />
            </div>
          </div>
        </div>
      </section>

      <section className={classes.featuresSection}>
        <h2>Secure your bitcoin with confidence</h2>
        <h4 style={{ color: "gray" }}>
          Powerful benefits for secure multisig management
        </h4>
        <div className={classes.featureContainer}>
          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <LockIcon fontSize="large" />
            </div>
            <h3 className={classes.featureTitle}>Security</h3>
            <p className={classes.featureDescription}>
              Minimize attack vectors with Caravan&apos;s stateless design and
              multisig coordination for enhanced Bitcoin security.
            </p>
          </div>

          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <LayersIcon fontSize="large" />
            </div>
            <h3 className={classes.featureTitle}>Transparency</h3>
            <p className={classes.featureDescription}>
              Maintain complete control over your private keys with open
              standards and user-managed key storage.
            </p>
          </div>

          <div className={classes.featureItem}>
            <div className={classes.featureIcon}>
              <MultipleStopIcon fontSize="large" />
            </div>
            <h3 className={classes.featureTitle}>Flexibility</h3>
            <p className={classes.featureDescription}>
              Enjoy seamless integration with hardware wallets, software
              applications, and a user-friendly interface for effortless
              multisig management.
            </p>
          </div>
        </div>
      </section>

      <section className={classes.ctaSection}>
        <Box
          sx={{
            width: "90%",
            borderRadius: "8px",
            padding: "16px",
            margin: "0 auto",
            backgroundColor: "#1976D2",
            paddingBottom: 10,
            paddingTop: 10,
          }}
        >
          <h1>Take control of your bitcoin. Create a multisig wallet today</h1>
          <p>
            Manage your bitcoin with increased security and control.
            Caravan&apos;s user-friendly interface guides you through creating,
            recovering, and managing multisig wallets. Take charge of your
            Bitcoin today!
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
              <img src={Logo} alt="Logo" style={{ width: 75, height: 60 }} />
            }
          >
            Caravan
          </Button>
          <p style={{ alignSelf: "center", color: "gray" }}>
            Multisig made easy. Manage your Bitcoin together with Caravan.
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
          >
            Blog
          </a>
          <a
            href="https://github.com/caravan-bitcoin/caravan/blob/main/apps/coordinator/README.md"
            className={classes.footerLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Tutorial
          </a>
          <a
            href="https://github.com/caravan-bitcoin/caravan"
            className={classes.footerLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source code
          </a>
        </div>
        <div className={classes.footerColumn}>
          <h4 className={classes.footerTitle}>Developer&apos;s corner</h4>
          <a
            href="https://github.com/caravan-bitcoin/caravan/issues"
            className={classes.footerLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
        <div className={classes.footerColumn}>
          <h4 className={classes.footerTitle}>Social</h4>
          <a
            href="https://twitter.com/unchainedcom"
            className={classes.footerLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Twitter
          </a>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
