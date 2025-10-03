import React from "react";
import { connect } from "react-redux";
import { TEST_FIXTURES } from "@caravan/bitcoin";
import { Grid, Box, Typography, Paper } from "@mui/material";
import { COLDCARD } from "@caravan/wallets";
import PropTypes from "prop-types";
// @ts-expect-error - qrcode.react doesn't have TypeScript declarations
import QRCode from "qrcode.react";

const { bip39Phrase } = TEST_FIXTURES.keys.open_source;

class SeedBase extends React.Component {
  static renderSeedWord(word, i) {
    return (
      <li key={i}>
        <code>{word}</code>
      </li>
    );
  }

  render() {
    const { keystore } = this.props;
    const seedPhrase = bip39Phrase.join(" ");
    
    return (
      <>
        <Grid container spacing={3}>
          <Grid item md={8}>
            <Grid container>
              <Grid item md={6}>
                <ol>{bip39Phrase.slice(0, 6).map(SeedBase.renderSeedWord)}</ol>
              </Grid>
              <Grid item md={6}>
                <ol start={7}>
                  {bip39Phrase.slice(6, 12).map(SeedBase.renderSeedWord)}
                </ol>
              </Grid>
              <Grid item md={6}>
                <ol start={13}>
                  {bip39Phrase.slice(12, 18).map(SeedBase.renderSeedWord)}
                </ol>
              </Grid>
              <Grid item md={6}>
                <ol start={19}>
                  {bip39Phrase.slice(18, 24).map(SeedBase.renderSeedWord)}
                </ol>
              </Grid>
            </Grid>
          </Grid>
          <Grid item md={4}>
            <Box display="flex" flexDirection="column" alignItems="flex-start" style={{ paddingLeft: '0px' }}>
              <Typography variant="subtitle2" gutterBottom>
                Seed Phrase QR Code
              </Typography>
              <Paper elevation={2} style={{ padding: '16px', backgroundColor: 'white' }}>
                <QRCode
                  value={seedPhrase}
                  size={280}
                  level="M"
                  includeMargin={true}
                />
              </Paper>
              <Typography variant="caption" color="textSecondary" align="center" style={{ marginTop: '8px', width: '100%' }}>
                Scan with a hardware wallet or other compatible device
              </Typography>
            </Box>
          </Grid>
        </Grid>
        {keystore && keystore.type === COLDCARD && (
          <Grid style={{ marginTop: "2em", marginBottom: "2em" }}>
            If using the simulator, here&apos;s a handy command with the same
            seed phrase:
            <br />
            <code>
              ./simulator.py --seed &apos;{bip39Phrase.join(" ")}&apos;
            </code>
          </Grid>
        )}
      </>
    );
  }
}

SeedBase.propTypes = {
  keystore: PropTypes.shape({
    note: PropTypes.string,
    type: PropTypes.string,
    status: PropTypes.string,
    version: PropTypes.string,
  }),
};

SeedBase.defaultProps = {
  keystore: null,
};

const mapStateToProps = () => {
  return {};
};

const mapDispatchToProps = {};

const Seed = connect(mapStateToProps, mapDispatchToProps)(SeedBase);

export default Seed;
