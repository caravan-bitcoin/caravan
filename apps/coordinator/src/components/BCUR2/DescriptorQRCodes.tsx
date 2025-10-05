import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  ButtonGroup,
} from "@mui/material";
// @ts-expect-error - qrcode.react doesn't have TypeScript declarations
import QRCode from "qrcode.react";
import { encodeDescriptors } from "@caravan/descriptors";

interface DescriptorQRCodesProps {
  multisigConfig: any; // Use any to avoid strict type checking since the config comes from various sources
  onDescriptorsGenerated?: (descriptors: {
    change: string;
    receive: string;
  }) => void;
}

interface Descriptors {
  change: string;
  receive: string;
}

/**
 * Component to display descriptor QR codes using the same encodeDescriptors function as the wallet page
 * Shows both receive and change descriptor QR codes with toggle buttons
 */
const DescriptorQRCodes: React.FC<DescriptorQRCodesProps> = ({
  multisigConfig,
  onDescriptorsGenerated,
}) => {
  const [descriptors, setDescriptors] = useState<Descriptors>({
    change: "",
    receive: "",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"receive" | "change">(
    "receive",
  );

  // Use ref to track if we've already generated descriptors
  const hasGeneratedRef = useRef(false);
  const configStringRef = useRef("");

  useEffect(() => {
    const generateDescriptors = async () => {
      try {
        // Stringify config to check if it actually changed
        const configString = JSON.stringify(multisigConfig);

        // Skip if we already generated for this exact config
        if (
          hasGeneratedRef.current &&
          configStringRef.current === configString
        ) {
          return;
        }

        configStringRef.current = configString;
        setLoading(true);
        setError(null);

        console.log("Generating descriptors with config:", multisigConfig);
        const descriptors = await encodeDescriptors(multisigConfig);

        setDescriptors(descriptors);
        setLoading(false);
        hasGeneratedRef.current = true;

        // Notify parent component
        if (onDescriptorsGenerated) {
          onDescriptorsGenerated(descriptors);
        }
      } catch (error: any) {
        console.error("Error generating descriptors:", error);
        setLoading(false);
        setError(error.message);
        setDescriptors({ change: "", receive: "" });
      }
    };

    if (multisigConfig) {
      generateDescriptors();
    }
  }, [multisigConfig, onDescriptorsGenerated]);

  if (loading) {
    return (
      <Box mb={3}>
        <Typography variant="h6" gutterBottom color="primary">
          Generating Wallet Descriptors...
        </Typography>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box mb={3}>
        <Typography variant="h6" gutterBottom color="error">
          Error Generating Descriptors
        </Typography>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  const currentDescriptor =
    selectedType === "receive" ? descriptors.receive : descriptors.change;

  return (
    <Box mb={3}>
      {/* Step 2: Wallet Descriptor with toggle */}
      <Typography variant="h6" gutterBottom color="primary">
        Step 2: Wallet Descriptor QR Code
      </Typography>

      {/* Button group to toggle between receive and change */}
      <Box mb={2}>
        <ButtonGroup variant="outlined" size="small">
          <Button
            variant={selectedType === "receive" ? "contained" : "outlined"}
            onClick={() => setSelectedType("receive")}
          >
            Receive Addresses
          </Button>
          <Button
            variant={selectedType === "change" ? "contained" : "outlined"}
            onClick={() => setSelectedType("change")}
          >
            Change Addresses
          </Button>
        </ButtonGroup>
      </Box>

      {currentDescriptor && (
        <>
          <Box border={1} borderColor="grey.300" p={2} borderRadius={2}>
            <QRCode value={currentDescriptor} size={300} level="M" />
          </Box>
          <Typography
            variant="caption"
            color="textSecondary"
            mt={1}
            display="block"
          >
            Scan this {selectedType} descriptor with your hardware wallet
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            mt={1}
            style={{ wordBreak: "break-all", fontSize: "0.75rem" }}
          >
            {selectedType === "receive" ? "Receive" : "Change"}:{" "}
            <code>{currentDescriptor}</code>
          </Typography>
        </>
      )}
    </Box>
  );
};

export default DescriptorQRCodes;
