import { useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { BlockchainClient } from "@caravan/clients";
import {
  createAcceleratedRbfTransaction,
  createCancelRbfTransaction,
  AcceleratedRbfOptions,
  SCRIPT_TYPES,
} from "@caravan/fees";
import { getChangeOutputIndex, extractUtxosForFeeBumping } from "../utils";
import { updateBlockchainClient } from "../../../../../actions/clientActions";

/**
 * Hook for RBF (Replace-By-Fee) operations with comprehensive wallet integration
 *
 * This hook provides the functionality needed to create RBF transactions
 * in two flavors:
 * 1. Accelerated RBF - keeps same outputs but increases fee
 * 2. Cancel RBF - redirects all funds to a new address
 *
 * It fully integrates with the wallet state to provide accurate UTXO information
 * and change address detection.
 */
export const useRBF = () => {
  const dispatch = useDispatch();

  // Track loading and error states
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get wallet settings from Redux store
  const network = useSelector((state: any) => state.settings.network);
  const addressType = useSelector((state: any) => state.settings.addressType);
  const requiredSigners = useSelector(
    (state: any) => state.settings.requiredSigners,
  );
  const totalSigners = useSelector((state: any) => state.settings.totalSigners);

  // Get wallet state for UTXO extraction and change address detection
  const walletState = useSelector((state: any) => state);

  // Get the next change address from the wallet
  const changeAddress = useSelector(
    (state: any) => state.wallet?.change?.nextNode?.multisig?.address,
  );

  /**
   * Gets the appropriate script type based on wallet address type
   * Maps Caravan address types to the fee package's script types
   */
  const getScriptType = useCallback(() => {
    switch (addressType) {
      case "P2SH-P2WSH":
        return SCRIPT_TYPES.P2SH_P2WSH;
      case "P2WSH":
        return SCRIPT_TYPES.P2WSH;
      default:
        return SCRIPT_TYPES.P2SH;
    }
  }, [addressType]);

  /**
   * Creates an accelerated RBF transaction that keeps the same outputs but with a higher fee
   *
   * This function performs the following steps:
   * 1. Extracts UTXOs from wallet state
   * 2. Identifies the change output in the original transaction
   * 3. Creates an accelerated RBF transaction with the same outputs but higher fee
   * 4. Returns the base64-encoded PSBT
   *
   * @param options Transaction and fee rate details
   * @returns Promise resolving to the base64-encoded PSBT
   */
  const createAcceleratedRBF = useCallback(
    async ({
      transaction,
      originalTxHex,
      feeRate,
      changeAddress: overrideChangeAddress,
    }: {
      transaction: any;
      originalTxHex: string;
      feeRate: number;
      changeAddress?: string;
    }) => {
      setIsCreating(true);
      setError(null);

      try {
        // Get blockchain client
        const blockchainClient = dispatch(
          updateBlockchainClient(),
        ) as unknown as BlockchainClient; // Hack to suppress type error , Ideally we want to Define AppDispatch in our Redux setup

        if (!blockchainClient) {
          throw new Error("Blockchain client not available");
        }

        // Extract UTXOs from wallet state
        const availableInputs = await extractUtxosForFeeBumping(
          transaction,
          walletState,
          blockchainClient,
        );

        if (!availableInputs.length) {
          throw new Error(
            "No UTXOs available for RBF. Transaction inputs may not be in your wallet.",
          );
        }
        // Find the change output index
        const changeIndex = getChangeOutputIndex(transaction, walletState);
        // Create accelerated RBF transaction options
        const scriptType = getScriptType();

        // We need either a change index or a change address
        if (
          changeIndex === undefined &&
          !overrideChangeAddress &&
          !changeAddress
        ) {
          throw new Error(
            "Could not determine change output. Please provide a change address.",
          );
        }

        // Create RBF options
        const options: AcceleratedRbfOptions = {
          originalTx: originalTxHex,
          network,
          targetFeeRate: feeRate,
          absoluteFee: transaction.fee.toString(),
          availableInputs,
          requiredSigners,
          totalSigners,
          scriptType,
          dustThreshold: "546", // Default dust threshold
          // Either use the found change index or provide a change address
          ...(changeIndex !== undefined ? { changeIndex } : {}),
          ...(overrideChangeAddress
            ? { changeAddress: overrideChangeAddress }
            : changeAddress
              ? { changeAddress }
              : {}),
          strict: false, // Less strict validation for better user experience
          fullRBF: false, // Only use signals RBF by default
          reuseAllInputs: true, // Safer option to prevent replacement cycle attacks
        };

        // Create the accelerated RBF transaction
        const psbtBase64 = createAcceleratedRbfTransaction(options);

        return psbtBase64;
      } catch (error) {
        console.error("Error creating accelerated RBF transaction:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unknown error creating RBF transaction",
        );
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [
      dispatch,
      network,
      addressType,
      requiredSigners,
      totalSigners,
      walletState,
      changeAddress,
      getScriptType,
    ],
  );
  /**
   * Creates a cancel RBF transaction that redirects all funds to a new address
   *
   * This function performs the following steps:
   * 1. Extracts UTXOs from wallet state
   * 2. Creates a cancel RBF transaction that sends all funds to the specified address
   * 3. Returns the base64-encoded PSBT
   *
   * Cancel transactions are useful when you want to completely replace a
   * transaction, for example to stop a payment that hasn't confirmed yet.
   *
   * @param options Transaction and cancel address details
   * @returns Promise resolving to the base64-encoded PSBT
   *
   * @see https://bitcoinops.org/en/topics/replace-by-fee/
   */
  const createCancelRBF = useCallback(
    async ({
      transaction,
      originalTxHex,
      feeRate,
      cancelAddress,
    }: {
      transaction: any;
      originalTxHex: string;
      feeRate: number;
      cancelAddress: string;
    }) => {
      setIsCreating(true);
      setError(null);

      try {
        // Get blockchain client
        const blockchainClient = dispatch(
          updateBlockchainClient(),
        ) as unknown as BlockchainClient;
        if (!blockchainClient) {
          throw new Error("Blockchain client not available");
        }

        // Extract UTXOs from wallet state
        const availableInputs = await extractUtxosForFeeBumping(
          transaction,
          walletState,
          blockchainClient,
        );

        if (!availableInputs.length) {
          throw new Error(
            "No UTXOs available for RBF. Transaction inputs may not be in your wallet.",
          );
        }

        // Create cancel RBF transaction options
        const scriptType = getScriptType();

        const options = {
          originalTx: originalTxHex,
          network,
          targetFeeRate: feeRate,
          absoluteFee: transaction.fee.toString(),
          availableInputs,
          requiredSigners,
          totalSigners,
          scriptType,
          dustThreshold: "546", // Default dust threshold
          cancelAddress,
          strict: false, // Less strict validation for better user experience
          fullRBF: false, // Only use signals RBF by default
          reuseAllInputs: false, // For cancel transactions, we don't need to reuse all inputs
        };

        // Create the cancel RBF transaction
        const psbtBase64 = createCancelRbfTransaction(options);

        return psbtBase64;
      } catch (error) {
        console.error("Error creating cancel RBF transaction:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unknown error creating cancel RBF transaction",
        );
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [
      dispatch,
      network,
      walletState,
      requiredSigners,
      totalSigners,
      getScriptType,
    ],
  );

  // Return the hook's API
  return {
    createAcceleratedRBF,
    createCancelRBF,
    isCreating,
    error,
  };
};
