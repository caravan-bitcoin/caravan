import React, { useState } from "react";
import { Button, FormHelperText } from "@mui/material";
import { useDispatch } from "react-redux";
import { importPSBT } from "actions/transactionActions";

// Helper function to detect if content is binary PSBT
const isBinaryPSBT = (arrayBuffer: ArrayBuffer) => {
  const uint8Array = new Uint8Array(arrayBuffer);
  // Check for binary PSBT magic bytes (0x70736274ff)
  return (
    uint8Array.length >= 5 &&
    uint8Array[0] === 0x70 &&
    uint8Array[1] === 0x73 &&
    uint8Array[2] === 0x62 &&
    uint8Array[3] === 0x74 &&
    uint8Array[4] === 0xff
  );
};

export const ImportPsbtButton: React.FC = () => {
  const dispatch = useDispatch();
  const [error, setError] = useState("");
  const [importPSBTDisabled, setImportPSBTDisabled] = useState(false);

  const handleError = (error: string) => {
    setError(error);
    setImportPSBTDisabled(false);
  };

  const handleImportPSBT = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportPSBTDisabled(true);
    const target = event.target as HTMLInputElement;
    try {
      if (target?.files?.length === 0) {
        handleError("No PSBT provided.");
        return;
      }
      if (target?.files?.length && target?.files?.length > 1) {
        handleError("Multiple PSBTs provided.");
        return;
      }
      const file = target?.files?.[0];
      const fileReader = new FileReader();
      fileReader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;

          if (isBinaryPSBT(arrayBuffer)) {
            // For binary PSBT, try Uint8Array first, fallback to base64 if needed
            try {
              const uint8Array = new Uint8Array(arrayBuffer);
              dispatch(importPSBT(uint8Array));
            } catch (bufferError) {
              // If direct binary fails, convert to base64 if needed
              console.warn(
                "Direct binary import failed, trying base64:",
                bufferError.message,
              );
              const uint8Array = new Uint8Array(arrayBuffer);
              let binaryString = "";
              for (let i = 0; i < uint8Array.length; i++) {
                binaryString += String.fromCharCode(uint8Array[i]);
              }
              const base64String = btoa(binaryString);
              dispatch(importPSBT(base64String));
            }
          } else {
            // Handle text PSBT
            const textDecoder = new TextDecoder("utf-8");
            const textContent = textDecoder.decode(arrayBuffer).trim();

            if (!textContent) {
              handleError("Invalid or empty PSBT file.");
              return;
            }

            dispatch(importPSBT(textContent));
          }

          handleError("");
        } catch (e) {
          handleError(e.message);
        }
      };

      fileReader.onerror = () => {
        handleError("Error reading file.");
        return;
      };

      if (file) {
        fileReader.readAsArrayBuffer(file);
      } else {
        handleError("No file selected.");
      }
      return;
    } catch (e) {
      handleError(e.message);
    }
  };
  return (
    <label htmlFor="import-psbt">
      <input
        style={{ display: "none" }}
        id="import-psbt"
        name="import-psbt"
        accept=".psbt,*/*"
        onChange={handleImportPSBT}
        type="file"
      />

      <Button
        color="primary"
        variant="contained"
        component="span"
        disabled={importPSBTDisabled}
        style={{ marginTop: "20px" }}
      >
        Import PSBT
      </Button>
      <FormHelperText error>{error}</FormHelperText>
    </label>
  );
};
