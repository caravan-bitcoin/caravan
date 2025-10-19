import {
  AcceleratedRbfOptions,
  CancelRbfOptions,
  createAcceleratedRbfTransaction,
  createCancelRbfTransaction,
  TransactionAnalyzer,
  UTXO,
  createCPFPTransaction,
  CPFPOptions,
} from "@caravan/fees";
import { extractUtxosForFeeBumping, validateTransactionInputs } from "../utils";
import { FeePriority, useFeeEstimates } from "clients/fees";
import { MultisigAddressType, Network } from "@caravan/bitcoin";
import {
  getChangeAddresses,
  getExtendedPublicKeyImporters,
  getWalletAddresses,
  selectWalletConfig,
  getWalletSlices,
  Slice,
} from "selectors/wallet";
import { useSelector } from "react-redux";
import { useEffect, useMemo, useState, useCallback } from "react";
import { TransactionDetails } from "@caravan/clients";
import { usePendingUtxos, useWalletUtxos } from "hooks/utxos";
import { buildUtxoFromSpendingTransaction } from "utils/uxtoReconstruction";
import { DUST_IN_SATOSHIS } from "utils/constants";

export const useGetAvailableUtxos = (transaction?: TransactionDetails) => {
  const {
    utxos: pendingUtxos,
    isLoading,
    isError,
  } = usePendingUtxos(transaction?.txid || "");
  const walletUtxos = useWalletUtxos();

  // Memoize the combined UTXOs so it only recalculates when dependencies change
  const availableUtxos = useMemo(() => {
    // Return empty array if no transaction
    if (!transaction) return [];
    return extractUtxosForFeeBumping(pendingUtxos || [], walletUtxos || []);
  }, [pendingUtxos, walletUtxos, transaction]);

  return { availableUtxos, isLoading, isError };
};

export const useGetGlobalXpubs = () => {
  const getGlobalXpubs = useSelector(getExtendedPublicKeyImporters); // same for the whole wallet
  return Object.values(getGlobalXpubs).map((item: any) => ({
    masterFingerprint: item.rootXfp,
    path: item.bip32Path,
    xpub: item.extendedPublicKey,
  }));
};

export const useAnalyzeTransaction = (
  transaction: TransactionDetails,
  txHex: string,
) => {
  const {
    availableUtxos,
    isLoading: isLoadingAvailableUtxos,
    isError: isErrorAvailableUtxos,
  } = useGetAvailableUtxos(transaction!);

  //  ChangeOutputIndex is critical for fee bumping strategies, specifically for CPFP (Child-Pays-For-Parent) it helps
  //  identify which output can be spent in a child transaction by the current wallet.
  const changeOutputIndex = useChangeOutputIndex(transaction);

  const { data: feeEstimates, isLoading: isLoadingFeeEstimates } =
    useFeeEstimates();

  const { network, addressType, requiredSigners, totalSigners } =
    useSelector(selectWalletConfig);

  const [error, setError] = useState("");

  useEffect(() => {
    if (isErrorAvailableUtxos) {
      setError("There was an error getting available utxos");
    } else {
      setError("");
    }
  }, [isErrorAvailableUtxos]);

  const analysis = useMemo(() => {
    if (
      !transaction ||
      !txHex ||
      !availableUtxos.length ||
      isLoadingFeeEstimates
    )
      return null;
    try {
      // Validate inputs
      validateTransactionInputs(txHex, transaction.fee, availableUtxos);
      // Create analyzer with wallet-specific parameters
      const analyzer = new TransactionAnalyzer({
        txHex,
        network: network as Network,
        targetFeeRate:
          feeEstimates[FeePriority.MEDIUM] ??
          (transaction.vsize ? transaction.fee / transaction.vsize : 250),
        absoluteFee: transaction.fee.toString(),
        availableUtxos,
        requiredSigners,
        totalSigners,
        addressType: addressType as MultisigAddressType,
        ...(changeOutputIndex !== undefined && { changeOutputIndex }),
      });
      let cpfpData = null;
      try {
        // added here in case `analyzer.cpfpFeeRate` throws an error
        cpfpData = {
          // we need this because for CPFP we cannot calculate feeRate simply as in RBF by using vsize and RBFFees
          feeRate: analyzer.cpfpFeeRate,
          childSize: analyzer.estimatedCPFPChildSize,
          estimatedPackageSize: analyzer.CPFPPackageSize,
        };
      } catch (cpfpError) {
        console.warn("CPFP calculation failed:", cpfpError);
        setError(
          cpfpError instanceof Error
            ? cpfpError.message
            : "CPFP calculation failed",
        );
      }

      return {
        analysis: analyzer.analyze(),
        cpfpData,
      };
    } catch (error) {
      console.error("Error analyzing transaction:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unknown error analyzing transaction",
      );
      return null;
    }
  }, [
    transaction?.txid,
    txHex,
    availableUtxos,
    feeEstimates,
    network,
    addressType,
    requiredSigners,
    totalSigners,
    changeOutputIndex,
  ]);

  return {
    analysis: analysis?.analysis ?? null,
    cpfp: analysis?.cpfpData ?? null,
    changeOutputIndex,
    availableUtxos,
    error,
    isLoading: isLoadingAvailableUtxos || isLoadingFeeEstimates,
  };
};

/**
 * Identifies the change output in a transaction by analyzing output addresses
 * and wallet data
 *
 * This function uses multiple heuristics to identify which output is the change:
 * 1. Matches against known wallet addresses
 * 2. Checks BIP32 path patterns (change addresses use path m/1/*)
 * 3. Position in outputs (change is often the last output)
 *
 * @param transaction - The transaction object
 * @param walletState - The wallet state containing addresses
 * @returns Index of the change output or undefined if not found
 *
 * @see https://en.bitcoin.it/wiki/Privacy#Change_address_detection
 */
export const useChangeOutputIndex = (
  transaction?: TransactionDetails,
): number | undefined => {
  const changeAddresses = useSelector(getChangeAddresses);
  const walletAddresses = useSelector(getWalletAddresses);

  if (!transaction) return undefined;
  if (!transaction.vout?.length) return undefined;

  const changeAddressesSet = new Set(changeAddresses);
  const walletAddressesSet = new Set(walletAddresses);

  // 1) First look for any explicit change‑address hits
  for (let i = 0; i < transaction.vout.length; i++) {
    const addr = transaction.vout[i].scriptPubkeyAddress;
    if (addr && changeAddressesSet.has(addr)) {
      return i;
    }
  }

  // 2) : Check if any output goes to a known wallet address
  // This is less reliable but can help identify change when the exact
  // change address isn't recognized
  for (let i = 0; i < transaction.vout.length; i++) {
    const addr = transaction.vout[i].scriptPubkeyAddress;
    if (addr && walletAddressesSet.has(addr)) {
      return i;
    }
  }

  return undefined;
};

export const useCreateAcceleratedRBF = (
  transaction: TransactionDetails,
  txHex: string,
  availableUtxos: UTXO[],
  fullRBF: boolean = false,
) => {
  const { network, addressType, requiredSigners, totalSigners } =
    useSelector(selectWalletConfig);
  const globalXpubs = useGetGlobalXpubs();
  const changeIndex = useChangeOutputIndex(transaction);

  const createAcceleratedRBF = useCallback(
    (feeRate: number, changeAddress?: string) => {
      if (
        !transaction ||
        !txHex ||
        !availableUtxos ||
        !network ||
        !addressType ||
        !requiredSigners ||
        !totalSigners ||
        !globalXpubs
      ) {
        throw new Error("Missing required parameters for accelerated RBF");
      }

      const rbfOptions: AcceleratedRbfOptions = {
        originalTx: txHex,
        network: network as Network,
        targetFeeRate: feeRate,
        absoluteFee: transaction.fee.toString(),
        availableInputs: availableUtxos,
        requiredSigners,
        totalSigners,
        scriptType: addressType as MultisigAddressType,
        dustThreshold: DUST_IN_SATOSHIS.toString(),
        ...(changeAddress ? { changeAddress } : { changeIndex }),
        strict: false, // Less strict validation for better user experience
        fullRBF,
        reuseAllInputs: true, // Safer option to prevent replacement cycle attacks
        globalXpubs,
      };

      return createAcceleratedRbfTransaction(rbfOptions);
    },
    [
      transaction,
      txHex,
      availableUtxos,
      network,
      addressType,
      requiredSigners,
      totalSigners,
      globalXpubs,
      changeIndex,
    ],
  );

  return { createAcceleratedRBF };
};

export const useCreateCancelRBF = (
  transaction: TransactionDetails,
  txHex: string,
  availableUtxos: UTXO[],
  fullRBF: boolean = false,
) => {
  const { network, addressType, requiredSigners, totalSigners } =
    useSelector(selectWalletConfig);
  const globalXpubs = useGetGlobalXpubs();

  const createCancelRBF = useCallback(
    (feeRate: number, cancelAddress: string) => {
      if (
        !cancelAddress ||
        !feeRate ||
        !globalXpubs ||
        !availableUtxos ||
        !transaction ||
        !txHex
      ) {
        throw new Error("Missing required parameters for cancel RBF");
      }

      const cancelRbfOptions: CancelRbfOptions = {
        originalTx: txHex,
        network: network as Network,
        targetFeeRate: feeRate,
        absoluteFee: transaction.fee.toString(),
        availableInputs: availableUtxos,
        scriptType: addressType as MultisigAddressType,
        cancelAddress,
        dustThreshold: DUST_IN_SATOSHIS.toString(),
        strict: false,
        fullRBF,
        reuseAllInputs: true,
        requiredSigners,
        totalSigners,
        globalXpubs,
      };

      try {
        return createCancelRbfTransaction(cancelRbfOptions);
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? error.message
            : "Unknown error creating cancel RBF",
        );
      }
    },
    [
      txHex,
      transaction?.fee,
      network,
      addressType,
      requiredSigners,
      totalSigners,
      globalXpubs,
      availableUtxos,
    ],
  );

  return { createCancelRBF };
};

export const useCreateCPFP = (
  transaction: TransactionDetails,
  txHex: string,
  availableUtxos: UTXO[],
) => {
  const { network, addressType, requiredSigners, totalSigners } =
    useSelector(selectWalletConfig);
  const globalXpubs = useGetGlobalXpubs();
  const walletSlices = useSelector(getWalletSlices);

  const createCPFP = useCallback(
    (feeRate: number, spendableOutputIndex: number, changeAddress: string) => {
      if (
        !transaction ||
        !txHex ||
        !availableUtxos ||
        !network ||
        !addressType ||
        !requiredSigners ||
        !totalSigners ||
        !globalXpubs ||
        !changeAddress ||
        spendableOutputIndex === undefined
      ) {
        throw new Error("Missing required parameters for CPFP");
      }
      const parentUtxo = buildUtxoFromSpendingTransaction(
        transaction,
        spendableOutputIndex,
        txHex,
        walletSlices as Slice[],
      ) as UTXO;
      const cpfpOptions: CPFPOptions = {
        originalTx: txHex,
        network: network as Network,
        targetFeeRate: feeRate,
        absoluteFee: transaction.fee.toString(),
        availableInputs: availableUtxos,
        requiredSigners,
        totalSigners,
        scriptType: addressType as MultisigAddressType,
        dustThreshold: DUST_IN_SATOSHIS.toString(),
        spendableOutputIndex,
        parentUtxo,
        changeAddress,
        strict: false, // Less strict validation for better user experience
        globalXpubs,
      };

      return createCPFPTransaction(cpfpOptions);
    },
    [
      transaction,
      txHex,
      availableUtxos,
      network,
      addressType,
      requiredSigners,
      totalSigners,
      globalXpubs,
    ],
  );

  return { createCPFP };
};
