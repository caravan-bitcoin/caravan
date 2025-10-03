import React from "react";
import PropTypes from "prop-types";
import {
  Typography,
  Grid,
  Tabs,
  Tab,
  Box,
  Tooltip,
  AppBar,
} from "@mui/material";
import { makeStyles } from "@mui/styles";

import UTXOSet from "../ScriptExplorer/UTXOSet";
import MultisigDetails from "../MultisigDetails";
import ImportAddressesButton from "../ImportAddressesButton";
import ConfirmAddress from "./ConfirmAddress";

import { slicePropTypes, clientPropTypes } from "../../proptypes";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
}));

function a11yProps(index) {
  return {
    id: `scrollable-auto-tab-${index}`,
    "aria-controls": `scrollable-auto-tabpanel-${index}`,
  };
}

const createTab = ({ tab }, index) => {
  const tooltipTab = (
    <Tab value={index.toString()} key={index} {...a11yProps(index)} {...tab} />
  );
  if (tab.disabled)
    return (
      <Tooltip title="Not available for this address" key={index} arrow>
        <div>{tooltipTab}</div>
      </Tooltip>
    );
  return tooltipTab;
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <Grid
      container
      justifyContent="center"
      style={{ display: value === index ? "inherit" : "none" }}
      {...other}
    >
      <Grid item md={11}>
        <Box>{children}</Box>
      </Grid>
    </Grid>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.string.isRequired,
  index: PropTypes.string.isRequired,
};

TabPanel.defaultProps = {
  children: React.createElement("span"),
};

const SliceDetails = ({ slice, client, network }) => {
  const [tabIndex, setTabIndex] = React.useState("0");
  const classes = useStyles();

  const handleChange = (_e, newIndex) => setTabIndex(newIndex);

  // Base tabs that are always present
  const baseTabs = [
    {
      tab: {
        label: "Redeem Script",
      },
      panel: <MultisigDetails multisig={slice.multisig} showAddress={false} />,
    },
    {
      tab: {
        label: "Confirm on Device",
      },
      panel: (
        <div>
          <Typography variant="h6">
            Verify Address with Quorum Participants
          </Typography>
          <Typography variant="caption">
            (not all device variants supported)
          </Typography>
          <ConfirmAddress slice={slice} network={network} />
        </div>
      ),
    },
  ];

  const conditionalTabs = [];

  // Only add UTXOs tab if there's a balance , we need this as if we render this in receive tab react does not play well and we get react stack pop issues
  if (slice.balanceSats.isGreaterThan(0)) {
    conditionalTabs.push({
      tab: {
        label: "UTXOs",
      },
      panel: (
        <UTXOSet
          inputs={slice.utxos}
          inputsTotalSats={slice.balanceSats}
          showSelection={false}
        />
      ),
    });
  }

  // Watch Address tab (only for private clients)
  if (client.type === "private") {
    conditionalTabs.push({
      tab: {
        label: "Watch Address",
      },
      panel: (
        <div>
          <Typography variant="h6">Import Watch-Only Address</Typography>
          <Typography variant="caption">
            Address must be imported to get accurate balance data. If this
            address has previous history, a rescan may be required.
          </Typography>
          <Box my={3}>
            <ImportAddressesButton
              addresses={[slice.multisig.address]}
              client={client}
            />
          </Box>
        </div>
      ),
    });
  }

  // Combine all tabs
  const tabs = [...baseTabs, ...conditionalTabs];

  return (
    <Grid container className={classes.root}>
      <AppBar
        elevation={0}
        position="static"
        color="default"
        variant="outlined"
      >
        <Tabs
          value={tabIndex}
          onChange={handleChange}
          aria-label="Slice Details View"
          centered
        >
          {tabs.map(createTab)}
        </Tabs>
      </AppBar>
      {tabs.map(({ panel }, index) => (
        <TabPanel value={tabIndex} index={index.toString()} key={index}>
          <Box my={3}>{panel}</Box>
        </TabPanel>
      ))}
    </Grid>
  );
};

SliceDetails.propTypes = {
  slice: PropTypes.shape(slicePropTypes).isRequired,
  client: PropTypes.shape(clientPropTypes).isRequired,
  network: PropTypes.string.isRequired,
};

export default SliceDetails;
