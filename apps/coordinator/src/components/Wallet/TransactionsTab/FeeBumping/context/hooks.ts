import { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";

import { TransactionAnalyzer } from "@caravan/fees";

import { FeePriority, useFeeEstimates } from "clients/fees";
import { usePendingUtxos, useWalletUtxos } from "hooks/utxos";
import {
  selectWalletConfig,
  getExtendedPublicKeyImporters,
  getWalletAddresses,
  getChangeAddresses,
} from "selectors/wallet";
import { MultisigAddressType, Network } from "@caravan/bitcoin";

import {
  setFeeBumpStatus,
  setFeeBumpError,
  setFeeBumpRecommendation,
} from "./feeBumpActions";

import { FeeBumpStatus, FeeBumpRecommendation } from "../types";
import { extractUtxosForFeeBumping, validateTransactionInputs } from "../utils";
import { TransactionDetails } from "@caravan/clients";
import { useFeeBumpContext } from "./FeeBumpContext";
// =============================================================================
// HOOKS
// =============================================================================

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

export const useGetAvailableUtxos = () => {
  const {
    state: { transaction },
  } = useFeeBumpContext();
  const { utxos: pendingUtxos } = usePendingUtxos(transaction?.txid || "");
  const walletUtxos = useWalletUtxos();

  // Memoize the combined UTXOs so it only recalculates when dependencies change
  return useMemo(
    () => extractUtxosForFeeBumping(pendingUtxos || [], walletUtxos || []),
    [pendingUtxos, walletUtxos, transaction?.txid],
  );
};

export const useGetGlobalXpubs = () => {
  const getGlobalXpubs = useSelector(getExtendedPublicKeyImporters); // same for the whole wallet
  return Object.values(getGlobalXpubs).map((item: any) => ({
    masterFingerprint: item.rootXfp,
    path: item.bip32Path,
    xpub: item.extendedPublicKey,
  }));
};

export const useAnalyzeTransaction = () => {
  const { state, dispatch } = useFeeBumpContext();
  const availableUtxos = useGetAvailableUtxos();
  const { data: feeEstimates } = useFeeEstimates();
  const { network, addressType, requiredSigners, totalSigners } =
    useSelector(selectWalletConfig);

  useEffect(() => {
    if (
      !state.transaction ||
      !availableUtxos.length ||
      state.status === FeeBumpStatus.READY
    ) {
      return;
    }

    try {
      dispatch(setFeeBumpStatus(FeeBumpStatus.ANALYZING));
      dispatch(setFeeBumpError(null));

      const targetFeeRate =
        feeEstimates[state.selectedPriority] ??
        feeEstimates[FeePriority.MEDIUM];

      if (!targetFeeRate || !state.transaction) {
        throw new Error(
          "Target fee rate or Transaction could not be determined.",
        );
      }

      // Validate inputs
      validateTransactionInputs(
        state.txHex,
        state.transaction.fee,
        availableUtxos,
      );

      // Create analyzer with wallet-specific parameters
      const analyzer = new TransactionAnalyzer({
        txHex: state.txHex,
        network: network as Network,
        targetFeeRate,
        absoluteFee: state.transaction.fee.toString(),
        availableUtxos,
        requiredSigners,
        totalSigners,
        addressType: addressType as MultisigAddressType,
      });

      // Get comprehensive analysis
      const analysis = analyzer.analyze();

      const feeBumpRecommendation: FeeBumpRecommendation = {
        ...analysis,
        currentFeeRate: analysis.feeRate,
        canRBF: analysis.canRBF,
        canCPFP: analysis.canCPFP,
        suggestedRBFFeeRate: Math.max(
          state.selectedFeeRate,
          Number(analysis.estimatedRBFFee) / analysis.vsize,
        ),
        userSelectedFeeRate: state.selectedFeeRate,
        userSelectedPriority: state.selectedPriority,
        suggestedCPFPFeeRate: Math.max(
          state.selectedFeeRate,
          Number(analysis.estimatedCPFPFee) / analysis.vsize,
        ),
        networkFeeEstimates: {
          highPriority: feeEstimates[FeePriority.HIGH]!,
          mediumPriority: feeEstimates[FeePriority.MEDIUM]!,
          lowPriority: feeEstimates[FeePriority.LOW]!,
        },
      };

      dispatch(setFeeBumpRecommendation(feeBumpRecommendation));
      dispatch(setFeeBumpStatus(FeeBumpStatus.READY));
    } catch (error) {
      console.error("Error analyzing transaction:", error);
      dispatch(
        setFeeBumpError(
          error instanceof Error
            ? error.message
            : "Unknown error analyzing transaction",
        ),
      );
    }
  }, [
    state.transaction?.txid,
    availableUtxos.length,
    state.status,
    state.selectedPriority,
    state.txHex,
    state.transaction?.fee,
    state.selectedFeeRate,
    feeEstimates,
    requiredSigners,
    totalSigners,
    addressType,
    network,
  ]);
};
