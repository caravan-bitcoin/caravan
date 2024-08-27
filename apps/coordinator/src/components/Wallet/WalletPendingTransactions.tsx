import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Box, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useGetClient } from "../../hooks";
// import { TransactionAnalyzer } from "@caravan/bitcoin";
import { AnalyzedTransaction, RootState, UTXO } from "./fee-bumping/types";
import { calculateTimeElapsed } from "./fee-bumping/utils";
import TransactionTable from "./fee-bumping/PendingTransactionTable";
import RBFOptionsDialog from "./fee-bumping/rbf/RBFOptionsDialog";
import AccelerateFeeDialog from "./fee-bumping/rbf/AccelerateFeeDialog";
import CancelTransactionDialog from "./fee-bumping/rbf/CancelTransactionDialog";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
}));

const WalletPendingTransactions: React.FC = () => {
  const [pendingTransactions, setPendingTransactions] = useState<
    AnalyzedTransaction[]
  >([]);
  const [selectedTx, setSelectedTx] = useState<AnalyzedTransaction | null>(
    null,
  );
  const [showRBFOptions, setShowRBFOptions] = useState(false);
  const [showIncreaseFees, setShowIncreaseFees] = useState(false);
  const [showCancelTx, setShowCancelTx] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const network = useSelector((state: RootState) => state.settings.network);
  const walletSlices = useSelector((state: RootState) => [
    ...Object.values(state.wallet.deposits.nodes),
    ...Object.values(state.wallet.change.nodes),
  ]);
  const blockchainClient = useGetClient();

  useEffect(() => {
    fetchPendingTransactions();
  }, [network, walletSlices, blockchainClient]);

  const fetchPendingTransactions = async () => {
    try {
      const pendingTxs = walletSlices
        .flatMap((slice) => slice.utxos)
        .filter((utxo) => !utxo.confirmed);

      const currentNetworkFeeRate = await getCurrentNetworkFeeRate();

      const analyzedTransactions = await Promise.all(
        pendingTxs.map(async (utxo) =>
          analyzeTransaction(utxo, currentNetworkFeeRate),
        ),
      );

      setPendingTransactions(analyzedTransactions);
    } catch (error) {
      console.error("Error fetching pending transactions:", error);
      setError("Failed to fetch pending transactions. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentNetworkFeeRate = async (): Promise<number> => {
    try {
      return await blockchainClient.getFeeEstimate();
    } catch (error) {
      console.error("Error fetching network fee rate:", error);
      return 1; // Default to 1 sat/vB if unable to fetch
    }
  };

  const analyzeTransaction = async (
    utxo: UTXO,
    currentNetworkFeeRate: number,
  ): Promise<AnalyzedTransaction> => {
    // const analyzer = new TransactionAnalyzer({
    //   txHex: utxo.transactionHex,
    //   network,
    //   targetFeeRate: currentNetworkFeeRate,
    //   // Add other required options for TransactionAnalyzer
    // });
    // const analysis = analyzer.analyze();

    return {
      ...utxo,
      timeElapsed: calculateTimeElapsed(utxo.time),
      currentFeeRate: currentNetworkFeeRate,
      canRBF: true,
      canCPFP: false,
    };
  };

  // const estimateBlocksToMine = (feeRate: number): number => {
  // TO DO (MRIGESH) : Implement new methods in client package's BlockchainClient class
  // to enable use of this method ...
  // };

  const handleRBF = (tx: AnalyzedTransaction) => {
    setSelectedTx(tx);
    setShowRBFOptions(true);
  };

  const handleCPFP = (tx: AnalyzedTransaction) => {
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
