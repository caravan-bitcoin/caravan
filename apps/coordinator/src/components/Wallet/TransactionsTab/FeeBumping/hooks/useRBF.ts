import { useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { BlockchainClient } from "@caravan/clients";
import { PsbtV2 } from "@caravan/psbt";
import {
  createAcceleratedRbfTransaction,
  createCancelRbfTransaction,
  AcceleratedRbfOptions,
  SCRIPT_TYPES,
} from "@caravan/fees";
import {
  getChangeOutputIndex,
  extractUtxosForFeeBumping,
  extractGlobalXpubsFromWallet,
} from "../utils";
import { updateBlockchainClient } from "../../../../../actions/clientActions";
import { FeeBumpResult, FeeBumpStatus } from "../types";
import {
  useFeeBumpDispatch,
  useFeeBumpTransaction,
  useFeeBumpTxHex,
  useSelectedFeeRate,
  useSelectedFeePriority,
  useCancelAddress,
  useChangeAddress,
  useRbfType,
  useSelectedFeeBumpStrategy,
  setFeeBumpStatus,
  setFeeBumpError,
  setFeeBumpResult,
  usePsbtVersion,
} from "../context";

/**
 * Hook for RBF (Replace-By-Fee) operations with comprehensive wallet integration
 *
 * This hook provides the functionality needed to create RBF transactions
 * in two flavors:
 * 1. Accelerated RBF - keeps same outputs but increases fee
 * 2. Cancel RBF - redirects all funds to a new address
 *
 * This hook only manages the loading state locally since it's specific to the operation.
 * All other state is managed by Redux.
 */
export const useRBF = () => {
  const dispatch = useDispatch();
  const feeBumpDispatch = useFeeBumpDispatch(); // dispatch for fee bump actions

  // We now only manage loading locally since it's operation-specific rest is redux managed
  const [isCreating, setIsCreating] = useState(false);

  // Get all state from Context
  const transaction = useFeeBumpTransaction();
  const txHex = useFeeBumpTxHex();
  const selectedFeeRate = useSelectedFeeRate();
  const selectedPriority = useSelectedFeePriority();
  const cancelAddress = useCancelAddress();
  const changeAddress = useChangeAddress();
  const rbfType = useRbfType();
  const selectedStrategy = useSelectedFeeBumpStrategy();
  const psbtVersion = usePsbtVersion();

  // Get wallet settings from Redux store
  const network = useSelector((state: any) => state.settings.network);
  const addressType = useSelector((state: any) => state.settings.addressType);
  const requiredSigners = useSelector(
    (state: any) => state.settings.requiredSigners,
  );
  const totalSigners = useSelector((state: any) => state.settings.totalSigners);

  // Get the next change address from the wallet
  const defaultChangeAddress = useSelector(
    (state: any) => state.wallet?.change?.nextNode?.multisig?.address,
  );

  // Get wallet nodes
  const depositNodes = useSelector((state: any) => state.wallet.deposits.nodes);
  const changeNodes = useSelector((state: any) => state.wallet.change.nodes);

  /**
   * Gets global extended public keys for PSBT inclusion
   */
  const getGlobalXpubs = useCallback(() => {
    return extractGlobalXpubsFromWallet(depositNodes, changeNodes);
  }, [depositNodes, changeNodes]);
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
    async (options?: { changeAddress?: string }) => {
      if (!transaction || !txHex) {
        throw new Error("No transaction data available");
      }

      setIsCreating(true);
      feeBumpDispatch(setFeeBumpStatus(FeeBumpStatus.CREATING));
      feeBumpDispatch(setFeeBumpError(null));

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
          depositNodes,
          changeNodes,
          blockchainClient,
        );

        if (!availableInputs.length) {
          throw new Error(
            "No UTXOs available for RBF. Transaction inputs may not be in your wallet.",
          );
        }
        // Find the change output index
        const changeIndex = getChangeOutputIndex(
          transaction,
          depositNodes,
          changeNodes,
        );

        // Create accelerated RBF transaction options
        const scriptType = getScriptType();

        // We need either a change index or a change address
        if (changeIndex === undefined && !changeAddress && !changeAddress) {
          throw new Error(
            "Could not determine change output. Please provide a change address.",
          );
        }

        // We determine change address with a clear priority:
        // 1. User-provided change address from the RBF form
        // 2. Change index from transaction analysis
        // 3. Default wallet change address
        let changeOptions = {};

        const userProvidedChangeAddress =
          options?.changeAddress || changeAddress;

        if (userProvidedChangeAddress) {
          // Priority 1: User explicitly provided a change address in the RBF form
          changeOptions = { changeAddress: userProvidedChangeAddress };
        } else if (changeIndex !== undefined) {
          // Priority 3: Use detected change index from transaction
          changeOptions = { changeIndex };
          // Priority 2: Use the wallet's default change address
        } else if (defaultChangeAddress) {
          changeOptions = { changeAddress: defaultChangeAddress };
        } else {
          // No valid change destination found
          throw new Error(
            "Could not determine change output. Please provide a change address.",
          );
        }
        // **Get global xpubs for PSBT**
        const globalXpubs = getGlobalXpubs();
        // Create RBF options
        const rbfOptions: AcceleratedRbfOptions = {
          originalTx: txHex,
          network,
          targetFeeRate: selectedFeeRate,
          absoluteFee: transaction.fee.toString() || "10",
          availableInputs,
          requiredSigners,
          totalSigners,
          scriptType,
          dustThreshold: "546", // Default dust threshold
          ...changeOptions,
          strict: false, // Less strict validation for better user experience
          fullRBF: false, // Only use signals RBF by default
          reuseAllInputs: true, // Safer option to prevent replacement cycle attacks
          globalXpubs, // **ADD GLOBAL XPUBS**
        };

        // Create the accelerated RBF transaction
        const psbtBase64 = createAcceleratedRbfTransaction(rbfOptions);

        // Convert PSBT version if needed ( based on how user wants to download it )
        const finalPsbtBase64 =
          psbtVersion === "v0"
            ? new PsbtV2(psbtBase64).toV0("base64")
            : psbtBase64;

        // Calculate estimated new fee
        const txVsize = transaction.vsize || transaction.size;
        const estimatedNewFee = Math.ceil(txVsize * selectedFeeRate).toString();

        // Create result
        const result: FeeBumpResult = {
          psbtBase64: finalPsbtBase64,
          newFee: estimatedNewFee,
          newFeeRate: selectedFeeRate,
          strategy: selectedStrategy,
          isCancel: false,
          priority: selectedPriority,
          createdAt: new Date().toISOString(),
        };

        feeBumpDispatch(setFeeBumpResult(result));

        return psbtBase64;
      } catch (error) {
        console.error("Error creating accelerated RBF transaction:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error creating RBF transaction";
        feeBumpDispatch(setFeeBumpError(errorMessage));
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [
      transaction,
      txHex,
      selectedFeeRate,
      selectedPriority,
      selectedStrategy,
      changeAddress,
      defaultChangeAddress,
      dispatch,
      feeBumpDispatch,
      network,
      addressType,
      requiredSigners,
      totalSigners,
      depositNodes,
      changeNodes,
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
    async (options?: { cancelAddress?: string }) => {
      if (!transaction || !txHex) {
        throw new Error("No transaction data available");
      }

      const addressToUse = options?.cancelAddress || cancelAddress;
      if (!addressToUse) {
        throw new Error("Cancel address is required");
      }

      setIsCreating(true);
      feeBumpDispatch(setFeeBumpStatus(FeeBumpStatus.CREATING));
      feeBumpDispatch(setFeeBumpError(null));

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
          depositNodes,
          changeNodes,
          blockchainClient,
        );

        if (!availableInputs.length) {
          throw new Error(
            "No UTXOs available for RBF. Transaction inputs may not be in your wallet.",
          );
        }

        // Create cancel RBF transaction options
        const scriptType = getScriptType();
        // **Get global xpubs for PSBT**
        const globalXpubs = getGlobalXpubs();
        const options = {
          originalTx: txHex,
          network,
          targetFeeRate: selectedFeeRate,
          absoluteFee: transaction.fee.toString() | "10",
          availableInputs,
          requiredSigners,
          totalSigners,
          scriptType,
          dustThreshold: "546", // Default dust threshold
          cancelAddress: addressToUse,
          strict: false,
          fullRBF: false,
          reuseAllInputs: true,
          globalXpubs, // **ADD GLOBAL XPUBS**
        };

        // Create the cancel RBF transaction
        const psbtBase64 = createCancelRbfTransaction(options);
        // Convert PSBT version if needed ( based on how user wants to download it )
        const finalPsbtBase64 =
          psbtVersion === "v0"
            ? new PsbtV2(psbtBase64).toV0("base64")
            : psbtBase64;
        // Calculate estimated new fee
        const txVsize = transaction.vsize || transaction.size;
        const estimatedNewFee = Math.ceil(txVsize * selectedFeeRate).toString();

        // Create result
        const result: FeeBumpResult = {
          psbtBase64: finalPsbtBase64,
          newFee: estimatedNewFee,
          newFeeRate: selectedFeeRate,
          strategy: selectedStrategy,
          isCancel: true,
          priority: selectedPriority,
          createdAt: new Date().toISOString(),
        };

        feeBumpDispatch(setFeeBumpResult(result));

        return psbtBase64;
      } catch (error) {
        console.error("Error creating cancel RBF transaction:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error creating cancel RBF transaction";
        feeBumpDispatch(setFeeBumpError(errorMessage));
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [
      transaction,
      txHex,
      selectedFeeRate,
      selectedPriority,
      selectedStrategy,
      cancelAddress,
      dispatch,
      feeBumpDispatch,
      network,
      requiredSigners,
      depositNodes,
      changeNodes,
      totalSigners,
      getScriptType,
    ],
  );

  /**
   * Creates a fee-bumped transaction based on RBF type
   */
  const createFeeBumpedTransaction = useCallback(
    async (
      customOptions: {
        isCancel?: boolean;
        cancelAddress?: string;
        changeAddress?: string;
      } = {},
    ) => {
      const isCancel = customOptions.isCancel ?? rbfType === "cancel";

      if (isCancel) {
        return await createCancelRBF({
          cancelAddress: customOptions.cancelAddress,
        });
      } else {
        return await createAcceleratedRBF({
          changeAddress: customOptions.changeAddress,
        });
      }
    },
    [rbfType, createCancelRBF, createAcceleratedRBF],
  );

  // Return the hook's API
  return {
    createAcceleratedRBF,
    createCancelRBF,
    createFeeBumpedTransaction,
    isCreating,
  };
};
