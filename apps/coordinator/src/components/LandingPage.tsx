import React from 'react';
import styled from 'styled-components';
import { Button, Container } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import LockIcon from '@mui/icons-material/Lock';

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
    color: #1976D2; /* Style for the word "Caravan" */
  }
`;


const Title = styled.h1`
  font-size: 4rem;
  width: 70%;
  margin: 0;
  color: #333;
`;

const Subtitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 300;
  width: 60%;
  margin: 20px 0;
  color: #666;
`;

const CTAButton = styled(Button)`
  && {
    background-color: #1976D2;
    color: #fff;
    padding: 10px 20px;
    font-size: 1.2rem;
    &:hover {
      background-color: #fff;
      color: #1976D2;
    }
  }
`;

const SecondaryButton = styled(Button)`
  && {
    background-color: #fff;
    color: #1976D2;
    padding: 10px 20px;
    font-size: 1.2rem;
    border: 2px solid #1976D2;
    &:hover {
      background-color: #1976D2;
      color: #fff;
    }
  }
`;

const ContentSection = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: #1976D2;
  color: white;
  text-align: center;
  padding-top: 50px;
  padding-bottom: 50px;
  .highlight {
    color: #1976D2; /* Style for the word "Caravan" */
  }
`;

const ContentContainer = styled.div`
  display: flex;
  justify-content: space-around;
  margin: 40px 0;
`;

const ContentItem = styled.div`
  flex: 1;
  padding: 20px;
`;

const ContentIcon = styled.div`
  font-size: 3rem;
  color: #667eea;
`;

const ContentTitle = styled.h3`
  margin-top: 20px;
  font-size: 1.5rem;
  color: #333;
`;

const ContentDescription = styled.p`
  color: #333;
`;

const FeaturesSection = styled.section`
  padding: 80px 0;
  background: #f9f9f9;
  text-align: center;
`;

const FeatureContainer = styled.div`
  display: flex;
  justify-content: space-around;
  margin: 40px 0;
`;

const FeatureItem = styled.div`
  flex: 1;
  padding: 20px;
`;

const FeatureIcon = styled.div`
  font-size: 3rem;
  color: #667eea;
`;

const FeatureTitle = styled.h3`
  margin-top: 20px;
  font-size: 1.5rem;
  color: #333;
`;

const FeatureDescription = styled.p`
  color: #666;
`;

const Footer = styled.footer`
  padding: 40px 0;
  background: #333;
  color: white;
  text-align: center;
`;

const LandingPage = () => {
  return (
    <>
      {/* Hero Section */}
      <HeroSection>
        <Title>
          Secure your bitcoin with <span className="highlight">Caravan</span>, a stateless multisig coordinator
        </Title>
        <Subtitle>
          Caravan simplifies multisig custody by coordinating your transaction without storing your keys. Gain security and control over your bitcoin.
        </Subtitle>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '400px' }}>
          <CTAButton variant="contained">Get Started</CTAButton>
          <SecondaryButton variant="contained">Learn More</SecondaryButton>
        </div>
        <img
          src="src/images/landing/caravan-balance.png"
          alt="Caravan Balance"
          style={{ marginTop: '100px', maxWidth: '50%', height: 'auto' }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', width: '80%', paddingTop: '20px', paddingBottom: '20px' }}>
        <img
            src="src/images/landing/trezor.png"
            alt="Trezor"
            style={{ height: '100px', width: 'auto' }}
        />
        <img
            src="src/images/landing/ledger.png"
            alt="Ledger"
            style={{ height: '100px', width: 'auto' }}
        />
        <img
            src="src/images/landing/coldcard.png"
            alt="Coldcard"
            style={{ height: '100px', width: 'auto' }}
        />
        <img
            src="src/images/landing/firefox.png"
            alt="Firefox"
            style={{ height: '100px', width: 'auto' }}
        />
        <img
            src="src/images/landing/chrome.png"
            alt="Chrome"
            style={{ height: '100px', width: 'auto' }}
        />
        </div>
      </HeroSection>

      <ContentSection>
        <Container>
          <ContentContainer>
            <ContentItem>
            <ContentTitle>Stateless Multisig Coordinator</ContentTitle>
            <ContentDescription>
            Caravan makes bitcoin multisig custody easier and safer through transparency and standards.
Caravan is a coordination software for multisig addresses and wallets. Caravan can be used to build a multisig wallet derived from xpubs, or individual multisig addresses derived from pubkeys. In both cases, in order to transact from the wallet or address, you must also have your private keys and BIP32 paths.
Caravan is stateless. It does not itself store any data outside your current browser session. You must safekeep the wallet details (xpubs, BIP32 paths) and addresses (redeem scripts, BIP32 paths) that you create
            </ContentDescription>
            <img
            src="src/images/landing/trezor.png"
            alt="Trezor"
            style={{ height: '100px', width: 'auto' }}
            />
            </ContentItem>

            <ContentItem>
            <ContentTitle>Keys</ContentTitle>
            <ContentDescription>
            All bitcoin is ultimately protected by private keys.
Your private key may live on a piece of paper, a hardware wallet, some software on a laptop, or even just in your mind. Caravan, being stateless, does not store or ask for your private key but it can talk to hardware devices or software applications which do.
Caravan supports entering public keys and signatures via text, so any wallet which can export such data can be made compatible with Caravan.
            </ContentDescription>
            <img
            src="src/images/landing/trezor.png"
            alt="Trezor"
            style={{ height: '100px', width: 'auto' }}
            />
            </ContentItem>

            <ContentItem>
            <ContentTitle>Consensus</ContentTitle>
            <ContentDescription>
            In order to look up wallet addresses and their balances, and broadcast transactions, Caravan requires knowledge of the constantly changing bitcoin network.
Running a full bitcoin node is the most private way to determine the current state of the bitcoin network. Caravan can be easily configured to use your own node for consensus information and broadcasting transactions.
If you don't want to or cannot run your own full node, Caravan defaults to using the freely available API at mempool.space.
            </ContentDescription>
            <img
            src="src/images/landing/trezor.png"
            alt="Trezor"
            style={{ height: '100px', width: 'auto' }}
            />
            </ContentItem>
          </ContentContainer>
        </Container>

      </ContentSection>

      {/* Features Section */}
      <FeaturesSection>
        <Container>
          <h2>Why Choose Caravan?</h2>
          <FeatureContainer>
            <FeatureItem>
              <FeatureIcon>
                <SavingsIcon fontSize="large" />
              </FeatureIcon>
              <FeatureTitle>Smart Savings</FeatureTitle>
              <FeatureDescription>
                Automatically save and invest with personalized suggestions.
              </FeatureDescription>
            </FeatureItem>

            <FeatureItem>
              <FeatureIcon>
                <SmartphoneIcon fontSize="large" />
              </FeatureIcon>
              <FeatureTitle>Mobile First</FeatureTitle>
              <FeatureDescription>
                Manage your money on-the-go with our seamless mobile app.
              </FeatureDescription>
            </FeatureItem>

            <FeatureItem>
              <FeatureIcon>
                <LockIcon fontSize="large" />
              </FeatureIcon>
              <FeatureTitle>Secure Transactions</FeatureTitle>
              <FeatureDescription>
                Your security is our priority with top-notch encryption technology.
              </FeatureDescription>
            </FeatureItem>
          </FeatureContainer>
        </Container>
      </FeaturesSection>

      {/* Footer */}
      <Footer>
        <p>&copy; 2024 Caravan Finance. All Rights Reserved.</p>
      </Footer>
    </>
  );
};

export default LandingPage;