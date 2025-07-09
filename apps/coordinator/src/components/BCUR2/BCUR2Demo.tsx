import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Tab,
  Tabs,
  Grid,
} from "@mui/material";
import { BCUR2Display, BCUR2PSBTExporter } from "./index";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`bcur2-tabpanel-${index}`}
      aria-labelledby={`bcur2-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const BCUR2Demo: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Sample PSBT for demonstration
  const samplePSBT = "cHNidP8BAHsCAAAAAljoeiG1ba8MI76OcHBFbDNvfLqlyHV5JPVFiHuyq911AAAAAAD/////g40EJ9DsZQpoqka7CwmK6kQiwHGyyng1Kgd5WdB86h0BAAAAAP////8CcKrwCAAAAAAWABTYXCtx0AYLCcmIauuBXlCZHdoSTQDh9QUAAAAAFgAUAK6pouXw+HaliN9VRuh0LR2HAI8AAAAAAAABAP1pAQIAAAABAbMN9k5PaVBvfEFrI1/5/FfRJLh5pvfqpN/8tF5x4GgAAAAAAAAAAAAA/////wM8GgGJAAAAAAGpY3ELs5+bIQJYAhEUhI0iAAAIVWEhAk9R0CCoAA7gvgAA5o8OUGSyiJv7tRg3mHOwjqgfhzuH3CfzCABkVwNqFAZGQAA0AFdIYUOKhFoaKaIHewLY+hH7gGkZJr1NG5FJZJc8F2hIlv8AAADq0tAAVUHy7Wk5IqJmOJKsAAAQS6LGU51vqYIIQlwBAAAACwABDwABEAICAD/////LAQEJAQNvPKESTwAAAAj6/////wERCQEEWqkJjAAAAtX/////AREJAQIoAAACAAAAAP//";

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        BCUR2 Encoder Components Demo
      </Typography>
      
      <Typography variant="body1" color="textSecondary" paragraph align="center">
        Encode PSBTs and other Bitcoin data into animated QR codes for hardware wallets
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="PSBT Exporter" />
          <Tab label="Direct Display" />
          <Tab label="Custom Settings" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <BCUR2PSBTExporter
                psbtBase64={samplePSBT}
                title="PSBT to QR Code Converter"
                description="This component allows you to convert a PSBT into animated QR codes that can be scanned by hardware wallets for signing."
              />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Direct QR Display
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                This shows a direct QR code display with default settings.
              </Typography>
              <Box display="flex" justifyContent="center">
                <BCUR2Display
                  data={samplePSBT}
                  width={300}
                  autoPlay={true}
                  animationSpeed={1500}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Fast Animation (500ms)
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Quick cycling through QR codes for rapid scanning.
              </Typography>
              <Box display="flex" justifyContent="center">
                <BCUR2Display
                  data={samplePSBT}
                  maxFragmentLength={80}
                  width={250}
                  autoPlay={true}
                  animationSpeed={500}
                />
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Slow Animation (2000ms)
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Slower cycling for easier manual scanning.
              </Typography>
              <Box display="flex" justifyContent="center">
                <BCUR2Display
                  data={samplePSBT}
                  maxFragmentLength={120}
                  width={250}
                  autoPlay={true}
                  animationSpeed={2000}
                />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Large Fragments
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Fewer QR codes with larger fragments (200 chars).
              </Typography>
              <Box display="flex" justifyContent="center">
                <BCUR2Display
                  data={samplePSBT}
                  maxFragmentLength={200}
                  width={250}
                  autoPlay={true}
                  animationSpeed={1000}
                />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Small Fragments
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                More QR codes with smaller fragments (50 chars).
              </Typography>
              <Box display="flex" justifyContent="center">
                <BCUR2Display
                  data={samplePSBT}
                  maxFragmentLength={50}
                  width={250}
                  autoPlay={true}
                  animationSpeed={1000}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
  );
};

export default BCUR2Demo;
