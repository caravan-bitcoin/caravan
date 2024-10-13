// src/LandingPage.jsx

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
  width: 70%;
  margin: 20px 0;
  color: #666;
`;

const CTAButton = styled(Button)`
  background-color: #1976D2;
  color: #fff;
  padding: 10px 20px;
  font-size: 1.2rem;
  &:hover {
    background-color: #fff;
    color: #1976D2;
  }
`;

const SecondaryButton = styled(Button)`
  background-color: #fff;
  color: #1976D2;
  padding: 10px 20px;
  font-size: 1.2rem;
  border: 2px solid #1976D2;
  &:hover {
    background-color: #1976D2;
    color: #fff;
  }
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
        <Subtitle>Caravan simplifies multisig custody by coordinating your transaction without storing your keys. Gain security and control over your bitcoin. </Subtitle>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '300px' }}>
            <CTAButton variant="contained">Get Started</CTAButton>
            <SecondaryButton variant="contained">Help</SecondaryButton>
        </div>
        <img 
            src="src/images/landing/caravan-balance.png" 
            //Users/joe-unchained/caravan/apps/coordinator/src/components/LandingPage.tsx
            alt="Caravan Balance" 
            style={{ marginTop: '100px', maxWidth: '50%', height: 'auto' }} 
        />

      </HeroSection>

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
