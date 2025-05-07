import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  AssessmentOutlined,
  HealthAndSafetyOutlined,
  AccountBalanceWalletOutlined,
} from "@mui/icons-material";
import FeeDashboard from "./FeeDashboard";
import PrivacyDashboard from "./PrivacyDashboard";
import UTXOExplorer from "./UTXOExplorer";
import { getWalletConfig } from "../../selectors/wallet";

// Define tab values as constants
const FEE_TAB = 0;
const PRIVACY_TAB = 1;
const UTXO_TAB = 2;

const HealthDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(FEE_TAB);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const walletConfig = useSelector(getWalletConfig);

  // Handle tab change
  const handleTabChange = (_: unknown, newValue: number) => {
    setActiveTab(newValue);
  };

  // Validate if we have enough data to show the dashboard
  const hasValidData = walletConfig && Object.keys(walletConfig).length > 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <HealthAndSafetyOutlined sx={{ mr: 1, verticalAlign: "middle" }} />
        Wallet Health Dashboard
      </Typography>

      {!hasValidData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please set up and load your wallet first to see health metrics.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {hasValidData && (
        <>
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab
                icon={<AssessmentOutlined />}
                label="Fee Health"
                id="fee-tab"
                aria-controls="fee-panel"
              />
              <Tab
                icon={<HealthAndSafetyOutlined />}
                label="Privacy Health"
                id="privacy-tab"
                aria-controls="privacy-panel"
              />
              <Tab
                icon={<AccountBalanceWalletOutlined />}
                label="UTXO Explorer"
                id="utxo-tab"
                aria-controls="utxo-panel"
              />
            </Tabs>
          </Paper>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box
                role="tabpanel"
                hidden={activeTab !== FEE_TAB}
                id="fee-panel"
              >
                {activeTab === FEE_TAB && <FeeDashboard />}
              </Box>

              <Box
                role="tabpanel"
                hidden={activeTab !== PRIVACY_TAB}
                id="privacy-panel"
              >
                {activeTab === PRIVACY_TAB && <PrivacyDashboard />}
              </Box>

              <Box
                role="tabpanel"
                hidden={activeTab !== UTXO_TAB}
                id="utxo-panel"
              >
                {activeTab === UTXO_TAB && <UTXOExplorer />}
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default HealthDashboard;
