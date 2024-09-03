import React, { useState } from "react";
import { Box, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useGetPendingTransactions } from "../../hooks";
import TransactionTable from "./fee-bumping/PendingTransactionTable";
import RBFOptionsDialog from "./fee-bumping/rbf/RBFOptionsDialog";
import AccelerateFeeDialog from "./fee-bumping/rbf/AccelerateFeeDialog";
import CancelTransactionDialog from "./fee-bumping/rbf/CancelTransactionDialog";
import { AnalyzerWithTimeElapsed } from "components/types/fees";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
}));

const WalletPendingTransactions: React.FC = () => {
  const { pendingTransactions, currentNetworkFeeRate, isLoading, error } =
    useGetPendingTransactions();
  const [, setSelectedTx] = useState<AnalyzerWithTimeElapsed | null>(null);
  const [showRBFOptions, setShowRBFOptions] = useState(false);
  const [showIncreaseFees, setShowIncreaseFees] = useState(false);
  const [showCancelTx, setShowCancelTx] = useState(false);

  // const estimateBlocksToMine = (feeRate: number): number => {
  // TO DO (MRIGESH) : Implement new methods in client package's BlockchainClient class
  // to enable use of this method ...
  // };

  const handleRBF = (tx: AnalyzerWithTimeElapsed) => {
    setSelectedTx(tx);
    setShowRBFOptions(true);
  };

  const handleCPFP = (tx: AnalyzerWithTimeElapsed) => {
    console.log("CPFP initiated for transaction:", tx.txid);
    //To Implement CPFP logic here
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
    setSelectedTx(null);
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
        onConfirm={closeAllModals}
      />

      <CancelTransactionDialog
        open={showCancelTx}
        onClose={closeAllModals}
        onConfirm={closeAllModals}
      />
    </Box>
  );
};

export default WalletPendingTransactions;
