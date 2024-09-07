import React, { useState, useCallback } from "react";
import {
  createAcceleratedRbfTransaction,
  createCancelRbfTransaction,
  createCPFPTransaction,
} from "@caravan/fees";
import { useSelector } from "react-redux";
import { Box, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useGetPendingTransactions } from "../../hooks";
import TransactionTable from "./fee-bumping/PendingTransactionTable";
import RBFOptionsDialog from "./fee-bumping/rbf/dialogs/RBFOptionsDialog";
import AccelerateFeeDialog from "./fee-bumping/rbf/dialogs/AccelerateFeeDialog";
import CancelTransactionDialog from "./fee-bumping/rbf/dialogs/CancelTransactionDialog";
import CPFPDialog from "./fee-bumping/cpfp/CPFPDialog";
import { ExtendedAnalyzer, RootState } from "components/types/fees";
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
}));
const WalletPendingTransactions: React.FC = () => {
  const { pendingTransactions, currentNetworkFeeRate, isLoading, error } =
    useGetPendingTransactions();
  console.log("check", pendingTransactions);
  const [selectedTx, setSelectedTx] = useState<ExtendedAnalyzer | null>(null);
  const [showRBFOptions, setShowRBFOptions] = useState(false);
  const [showIncreaseFees, setShowIncreaseFees] = useState(false);
  const [showCancelTx, setShowCancelTx] = useState(false);
  const [showCPFP, setShowCPFP] = useState(false);
  const [feePsbt, setFeePsbt] = useState<string | null>(null);
  const [isGeneratingPSBT, setIsGeneratingPSBT] = useState(false);
  // const estimateBlocksToMine = (feeRate: number): number => {
  // TO DO (MRIGESH) : Implement new methods in client package's BlockchainClient class
  // to enable use of this method ...
  // };
  //

  // get change addr

  const changeAddresses = useSelector((state: RootState) => [
    ...Object.values(state.wallet.change.nodes),
  ]);

  console.log("changeadd", changeAddresses[0].multisig.address);

  const settings = useSelector((state: RootState) => state.settings);
  const handleRBF = (tx: ExtendedAnalyzer) => {
    setSelectedTx(tx);
    console.log("handleRBF", tx);

    setShowRBFOptions(true);
  };
  const handleCPFP = (tx: ExtendedAnalyzer) => {
    setSelectedTx(tx);
    setShowCPFP(true);
  };
  const handleIncreaseFees = () => {
    setShowRBFOptions(false);
    setShowIncreaseFees(true);
  };
  const handleCancelTx = () => {
    setShowRBFOptions(false);
    setShowCancelTx(true);
  };
  const closeAllModals = () => {
    setShowRBFOptions(false);
    setShowIncreaseFees(false);
    setShowCancelTx(false);
    setShowCPFP(false);
    setSelectedTx(null);
    setFeePsbt(null);
  };

  const handleAccelerateFee = async (newFeeRate: number) => {
    if (selectedTx) {
      try {
        const result = createAcceleratedRbfTransaction({
          originalTx: selectedTx.txHex,
          targetFeeRate: newFeeRate,
          network: settings.network,
          availableInputs: selectedTx.analyzer.availableUTXOs,
          dustThreshold: "546",
          scriptType: settings.addressType,
          requiredSigners: settings.requiredSigners,
          totalSigners: settings.totalSigners,
          absoluteFee: selectedTx.analyzer.fee,
          changeIndex: selectedTx.analyzer["_changeOutputIndex"],
        });
        setFeePsbt(result);
        setShowIncreaseFees(false);
      } catch (error) {
        console.error("Error creating accelerated RBF transaction:", error);
        //TO DO :  Handle error (e.g., show an error message to the user)
      }
    }
  };

  const createAccelerateFeePsbt = useCallback(
    (newFeeRate: number): string => {
      if (selectedTx) {
        setIsGeneratingPSBT(true);
        try {
          const result = createAcceleratedRbfTransaction({
            originalTx: selectedTx.txHex,
            targetFeeRate: newFeeRate,
            network: settings.network,
            availableInputs: selectedTx.analyzer.availableUTXOs,
            changeAddress: settings.changeAddress,
            dustThreshold: "546",
            scriptType: settings.addressType,
            requiredSigners: settings.requiredSigners,
            totalSigners: settings.totalSigners,
            absoluteFee: selectedTx.analyzer.fee,
            changeIndex: 0,
          });
          return result;
        } catch (error) {
          console.error("Error creating accelerated RBF transaction:", error);
          throw error; // Rethrow the error to be handled in the dialog
        } finally {
          setIsGeneratingPSBT(false);
        }
      }
      throw new Error("No transaction selected");
    },
    [selectedTx, settings],
  );

  const handleCancelTransaction = async (newFeeRate: number) => {
    if (selectedTx) {
      try {
        const result = createCancelRbfTransaction({
          originalTx: selectedTx.txHex,
          targetFeeRate: newFeeRate,
          network: settings.network,
          availableInputs: selectedTx.analyzer.availableUTXOs,
          cancelAddress: changeAddresses[0].multisig.address,
          dustThreshold: "546",
          scriptType: settings.addressType,
          requiredSigners: settings.requiredSigners,
          totalSigners: settings.totalSigners,
          absoluteFee: selectedTx.analyzer.fee,
        });
        setFeePsbt(result);
        setShowCancelTx(false);
      } catch (error) {
        console.error("Error creating cancel RBF transaction:", error);
        //TO DO :  Handle error (e.g., show an error message to the user)
      }
    }
  };

  const createCancelFeePsbt = useCallback(
    (newFeeRate: number): string => {
      if (selectedTx) {
        setIsGeneratingPSBT(true);
        try {
          const result = createCancelRbfTransaction({
            originalTx: selectedTx.txHex,
            targetFeeRate: newFeeRate,
            network: settings.network,
            availableInputs: selectedTx.analyzer.availableUTXOs,
            cancelAddress: changeAddresses[0].multisig.address,
            dustThreshold: "546",
            scriptType: settings.addressType,
            requiredSigners: settings.requiredSigners,
            totalSigners: settings.totalSigners,
            absoluteFee: selectedTx.analyzer.fee,
          });
          return result;
        } catch (error) {
          console.error("Error creating accelerated RBF transaction:", error);
          throw error; // Rethrow the error to be handled in the dialog
        } finally {
          setIsGeneratingPSBT(false);
        }
      }
      throw new Error("No transaction selected");
    },
    [selectedTx, settings],
  );

  const createCPFPPsbt = useCallback(
    (newFeeRate: number): string => {
      if (selectedTx) {
        setIsGeneratingPSBT(true);
        try {
          const result = createCPFPTransaction({
            originalTx: selectedTx.txHex,
            targetFeeRate: newFeeRate,
            network: settings.network,
            availableInputs: selectedTx.analyzer.availableUTXOs,
            changeAddress: changeAddresses[0].multisig.address,
            dustThreshold: "546",
            scriptType: settings.addressType,
            requiredSigners: settings.requiredSigners,
            totalSigners: settings.totalSigners,
            absoluteFee: selectedTx.analyzer.fee,
            spendableOutputIndex: selectedTx.analyzer.outputs.findIndex(
              (output) => output.isMalleable,
            ),
          });
          return result;
        } catch (error) {
          console.error("Error creating CPFP transaction:", error);
          throw error;
        } finally {
          setIsGeneratingPSBT(false);
        }
      }
      throw new Error("No transaction selected");
    },
    [selectedTx, settings, changeAddresses],
  );

  const handleConfirmCPFP = async (newFeeRate: number) => {
    if (selectedTx) {
      try {
        const result = createCPFPPsbt(newFeeRate);
        setFeePsbt(result);
        setShowCPFP(false);
      } catch (error) {
        console.error("Error creating CPFP transaction:", error);
        // TODO: Handle error (e.g., show an error message to the user)
      }
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <StyledPaper elevation={3}>
        <TransactionTable
          transactions={pendingTransactions}
          onRBF={handleRBF}
          onCPFP={handleCPFP}
          isLoading={isLoading}
          currentFeeRate={currentNetworkFeeRate!}
          error={error}
        />
      </StyledPaper>
      <RBFOptionsDialog
        open={showRBFOptions}
        onClose={closeAllModals}
        onIncreaseFees={handleIncreaseFees}
        onCancelTx={handleCancelTx}
      />
      <AccelerateFeeDialog
        open={showIncreaseFees}
        onClose={closeAllModals}
        onConfirm={handleAccelerateFee}
        createPsbt={createAccelerateFeePsbt}
        transaction={selectedTx}
        currentNetworkFeeRate={currentNetworkFeeRate!}
        isGeneratingPSBT={isGeneratingPSBT}
      />

      <CancelTransactionDialog
        open={showCancelTx}
        onClose={closeAllModals}
        onConfirm={handleCancelTransaction}
        createPsbt={createCancelFeePsbt}
        transaction={selectedTx}
        currentNetworkFeeRate={currentNetworkFeeRate!}
        isGeneratingPSBT={isGeneratingPSBT}
      />
      <CPFPDialog
        open={showCPFP}
        onClose={closeAllModals}
        onConfirm={handleConfirmCPFP}
        createPsbt={createCPFPPsbt}
        transaction={selectedTx}
        currentNetworkFeeRate={currentNetworkFeeRate!}
        isGeneratingPSBT={isGeneratingPSBT}
        defaultChangeAddress=""
      />
    </Box>
  );
};
export default WalletPendingTransactions;
