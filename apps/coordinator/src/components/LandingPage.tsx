import React from "react";
import styled from "styled-components";
import Box from "@mui/material/Box";
import { Button } from "@mui/material";
import MultipleStopIcon from "@mui/icons-material/MultipleStop";
import LockIcon from "@mui/icons-material/Lock";
import LayersIcon from "@mui/icons-material/Layers";
import { Link } from "react-router-dom";
import Logo from "../../../../assets/images/caravan-logo-transparent.png";

const HeroSection = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: white;
  color: white;
  text-align: center;
  padding-top: 50px;
  padding-bottom: 50px;
  .highlight {
    color: #1976d2; /* Style for the word "Caravan" */
  }
`;

const Title = styled.h1`
  font-size: 4rem;
  width: 70%;
  margin: 0;
  color: #333;
  @media (max-width: 768px) {
    font-size: 2.5rem;
    width: 90%;
  }
`;

const Subtitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 300;
  width: 60%;
  margin: 20px 0;
  color: #666;
  @media (max-width: 768px) {
    font-size: 1.2rem;
    width: 90%;
  }
`;

const CTAButton = styled(Button)`
  && {
    background-color: #1976d2;
    color: #fff;
    padding: 10px 20px;
    font-size: 1.2rem;
    &:hover {
      background-color: #fff;
      color: #1976d2;
      outline: #1976d2 solid 1px;
    }
  }
`;

const SecondaryButton = styled(Button)`
  && {
    background-color: #fff;
    color: #1976d2;
    padding: 10px 20px;
    font-size: 1.2rem;
    border: 1px solid #1976d2;
    &:hover {
      background-color: #1976d2;
      color: #fff;
    }
  }
`;

const YellowButton = styled(Button)`
  && {
    background-color: #ea9c0d;
    color: #333;
    padding: 10px 20px;
    font-size: 1.2rem;
    &:hover {
      background-color: #fff;
      color: #1976d2;
    }
  }
`;

const ContentSection = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: #1976d2;
  color: white;
  text-align: center;
  padding: 80px 0;
  border-radius: 10px;
  .highlight {
    color: #1976d2; /* Style for the word "Caravan" */
  }
`;

const ContentTitle = styled.h3`
  font-size: 2rem;
  color: #fff;
  text-align: left;
  width: 80%;
  margin: 20px auto;
  @media (max-width: 1200px) {
    font-size: 1.5rem;
    width: 90%;
  }
`;

const ContentDescription = styled.p`
  color: #fff;
  width: 80%;
  margin: 0 auto;
  text-align: left;
  font-size: 1.5rem;
  @media (max-width: 1200px) {
    font-size: 1.2rem;
    width: 90%;
  }
`;

const FullWidthBox = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  margin-bottom: 20px;
  @media (max-width: 1200px) {
    flex-direction: column;
  }
`;

const ImageSection = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 20px;
  padding: 50px;
  @media (max-width: 1200px) {
    margin-right: 0;
    padding: 20px;
  }
`;

const DescriptionSection = styled.div`
  flex: 2;
  padding: 10px;
`;

const FeaturesSection = styled.section`
  padding: 80px 0;
  background: #fff;
  text-align: center;
`;

const FeatureContainer = styled.div`
  display: flex;
  justify-content: space-around;
  margin: 40px 200px;
  gap: 100px;
  @media (max-width: 768px) {
    flex-direction: column;
    margin: 20px;
    gap: 20px;
  }
`;

const FeatureItem = styled.div`
  flex: 1;
  padding: 20px;
`;

const FeatureIcon = styled.div`
  font-size: 3rem;
  color: #1976d2;
  text-align: left;
`;

const FeatureTitle = styled.h3`
  margin-top: 20px;
  font-size: 1.5rem;
  color: #333;
  text-align: left;
`;

const FeatureDescription = styled.p`
  color: #666;
  text-align: left;
`;

const CtaSection = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: #fff;
  color: white;
  text-align: center;
  padding: 80px 0;
  .highlight {
    color: #1976d2;
  }
`;

const Footer = styled.footer`
  padding: 40px 0;
  background: #fff;
  color: #000;
  text-align: left;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 20px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const FooterColumn = styled.div`
  display: flex;
  flex-direction: column;
`;

const FooterTitle = styled.h4`
  margin-bottom: 10px;
  color: #000;
`;

const FooterLink = styled.a`
  color: #000;
  text-decoration: none;
  margin-bottom: 5px;
  &:hover {
    text-decoration: underline;
  }
`;

const LogoButton = styled(Button)`
  && {
    background-color: #fff;
    color: #1976d2;
    padding: 10px 20px;
    font-size: 2rem;
    outline: none;
    box-shadow: none;
    &:hover {
      background-color: #fff;
      color: #1976d2;
    }
    font-weight: bold;
    text-transform: none;
  }
`;

const LandingPage = () => {
  return (
    <>
      <HeroSection>
        <Title>
          Secure your bitcoin with <span className="highlight">Caravan</span>, a
          stateless multisig coordinator
        </Title>
        <Subtitle>
          Caravan simplifies multisig custody by coordinating your transaction
          without storing your keys. Gain security and control over your
          bitcoin.
        </Subtitle>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "400px",
            flexWrap: "wrap",
          }}
        >
          <Link to="/setup">
            <CTAButton variant="contained">Get Started</CTAButton>
          </Link>
          <SecondaryButton variant="contained">Learn More</SecondaryButton>
        </div>
        <img
          src="src/images/landing/caravan-balance.png"
          alt="Caravan Balance"
          style={{ marginTop: "100px", maxWidth: "50%", height: "auto" }}
        />
        <div className="image-grid-container">
          <div className="image-grid">
            <img
              src="src/images/landing/trezor.png"
              alt="Trezor"
              style={{ height: "80px", width: "auto", padding: "10px" }}
            />
            <img
              src="src/images/landing/ledger.png"
              alt="Ledger"
              style={{ height: "80px", width: "auto", padding: "10px" }}
            />
            <img
              src="src/images/landing/coldcard.png"
              alt="Coldcard"
              style={{ height: "80px", width: "auto", padding: "10px" }}
            />
            <img
              src="src/images/landing/firefox.png"
              alt="Firefox"
              style={{ height: "80px", width: "auto", padding: "10px" }}
            />
            <img
              src="src/images/landing/chrome.png"
              alt="Chrome"
              style={{ height: "80px", width: "auto", padding: "10px" }}
            />
          </div>
        </div>
      </HeroSection>

      <ContentSection>
        <FullWidthBox className="full-width-box">
          <DescriptionSection className="description-section">
            <ContentTitle>Stateless Multisig Coordinator</ContentTitle>
            <ContentDescription>
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
            </ContentDescription>
          </DescriptionSection>
          <ImageSection className="image-section">
            <div
              className="responsive-image"
              style={{
                backgroundColor: "#FFE7BB",
                padding: "40px",
                borderRadius: "10px",
              }}
            >
              <img
                src="src/images/landing/stateless.png"
                alt="Trezor"
                style={{ height: "400px", width: "auto", borderRadius: "10px" }}
              />
            </div>
          </ImageSection>
        </FullWidthBox>

        <FullWidthBox className="full-width-box">
          <ImageSection className="image-section">
            <div
              className="responsive-image"
              style={{
                backgroundColor: "#FFE7BB",
                padding: "40px",
                borderRadius: "10px",
              }}
            >
              <img
                src="src/images/landing/xpubs.png"
                alt="Trezor"
                style={{ height: "400px", width: "auto", borderRadius: "10px" }}
              />
            </div>
          </ImageSection>
          <DescriptionSection className="description-section">
            <ContentTitle>Keys</ContentTitle>
            <ContentDescription>
              All bitcoin is ultimately protected by private keys. Your private
              key may live on a piece of paper, a hardware wallet, some software
              on a laptop, or even just in your mind. Caravan, being stateless,
              does not store or ask for your private key but it can talk to
              hardware devices or software applications which do. Caravan
              supports entering public keys and signatures via text, so any
              wallet which can export such data can be made compatible with
              Caravan.
            </ContentDescription>
          </DescriptionSection>
        </FullWidthBox>

        <FullWidthBox className="full-width-box">
          <DescriptionSection className="description-section">
            <ContentTitle>Consensus</ContentTitle>
            <ContentDescription>
              In order to look up wallet addresses and their balances, and
              broadcast transactions, Caravan requires knowledge of the
              constantly changing bitcoin network. Running a full bitcoin node
              is the most private way to determine the current state of the
              bitcoin network. Caravan can be easily configured to use your own
              node for consensus information and broadcasting transactions. If
              you don&apos;t want to or cannot run your own full node, Caravan
              defaults to using the freely available API at mempool.space.
            </ContentDescription>
          </DescriptionSection>
          <ImageSection className="image-section">
            <div
              className="responsive-image"
              style={{
                backgroundColor: "#FFE7BB",
                padding: "40px",
                borderRadius: "10px",
              }}
            >
              <img
                src="src/images/landing/consensus.png"
                alt="Trezor"
                style={{ height: "400px", width: "auto", borderRadius: "10px" }}
              />
            </div>
          </ImageSection>
        </FullWidthBox>
      </ContentSection>

      <FeaturesSection>
        <h2>Secure your bitcoin with confidence</h2>
        <h4 style={{ color: "gray" }}>
          Powerful benefits for secure multisig management
        </h4>
        <FeatureContainer>
          <FeatureItem>
            <FeatureIcon>
              <LockIcon fontSize="large" />
            </FeatureIcon>
            <FeatureTitle>Security</FeatureTitle>
            <FeatureDescription>
              Minimize attack vectors with Caravan&apos;s stateless design and
              multisig coordination for enhanced Bitcoin security.
            </FeatureDescription>
          </FeatureItem>

          <FeatureItem>
            <FeatureIcon>
              <LayersIcon fontSize="large" />
            </FeatureIcon>
            <FeatureTitle>Transparency</FeatureTitle>
            <FeatureDescription>
              Maintain complete control over your private keys with open
              standards and user-managed key storage.
            </FeatureDescription>
          </FeatureItem>

          <FeatureItem>
            <FeatureIcon>
              <MultipleStopIcon fontSize="large" />
            </FeatureIcon>
            <FeatureTitle>Flexibility</FeatureTitle>
            <FeatureDescription>
              Enjoy seamless integration with hardware wallets, software
              applications, and a user-friendly interface for effortless
              multisig management.
            </FeatureDescription>
          </FeatureItem>
        </FeatureContainer>
      </FeaturesSection>

      <CtaSection>
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
            <YellowButton variant="contained" style={{ textTransform: "none" }}>
              Get started
            </YellowButton>
          </Link>
        </Box>
      </CtaSection>

      <Footer>
        <FooterColumn>
          <LogoButton
            variant="contained"
            startIcon={
              <img src={Logo} alt="Logo" style={{ width: 75, height: 60 }} />
            }
          >
            Caravan
          </LogoButton>
          <p style={{ alignSelf: "center", color: "gray" }}>
            Multisig made easy. Manage your Bitcoin together with Caravan.
          </p>
          <p style={{ alignSelf: "center" }}>
            &copy; 2024 Caravan Finance. All Rights Reserved.
          </p>
        </FooterColumn>
        <FooterColumn>
          <FooterTitle>Getting started</FooterTitle>
          <FooterLink href="#">Home</FooterLink>
          <FooterLink href="#">About</FooterLink>
          <FooterLink href="#">Test suite</FooterLink>
          <FooterLink href="#">Help</FooterLink>
        </FooterColumn>
        <FooterColumn>
          <FooterTitle>Resources</FooterTitle>
          <FooterLink href="#">Blog</FooterLink>
          <FooterLink href="#">Tutorial</FooterLink>
          <FooterLink href="#">Source code</FooterLink>
        </FooterColumn>
        <FooterColumn>
          <FooterTitle>Developer&apos;s corner</FooterTitle>
          <FooterLink href="#">GitHub</FooterLink>
        </FooterColumn>
        <FooterColumn>
          <FooterTitle>Social</FooterTitle>
          <FooterLink href="#">Twitter</FooterLink>
          <FooterLink href="#">Discord</FooterLink>
        </FooterColumn>
      </Footer>
    </>
  );
};

export default LandingPage;
