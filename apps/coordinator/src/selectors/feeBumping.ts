import { createSelector } from "reselect";
import { FeeBumpingState } from "../reducers/feeBumpingReducer";

// Base selector for getting overall State
export const getFeeBumpingState = (state: { feeBumping: FeeBumpingState }) =>
  state.feeBumping;

// Transaction data selectors
export const getFeeBumpTransaction = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.transaction,
);
export const getFeeBumpTxHex = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.txHex,
);

// Process state selectors
export const getFeeBumpStatus = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.status,
);

export const getFeeBumpError = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.error,
);

// Analysis selectors
export const getFeeBumpRecommendation = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.recommendation,
);

// User selection selectors
export const getSelectedFeeBumpStrategy = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.selectedStrategy,
);

export const getSelectedFeeRate = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.selectedFeeRate,
);

export const getSelectedFeePriority = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.selectedPriority,
);

// RBF form selectors
export const getRbfType = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.rbfType,
);

export const getCancelAddress = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.cancelAddress,
);

export const getChangeAddress = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.changeAddress,
);

// Result selectors
export const getFeeBumpResult = createSelector(
  getFeeBumpingState,
  (feeBumping) => feeBumping.result,
);

// Computed selectors
export const getIsFeeBumpReady = createSelector(
  [getFeeBumpingState],
  (feeBumping) =>
    feeBumping.recommendation !== null &&
    feeBumping.selectedStrategy !== "NONE" &&
    feeBumping.selectedFeeRate > 0,
);

export const getOriginalFeeRate = createSelector(
  [getFeeBumpTransaction],
  (transaction) => {
    if (!transaction) return 0;
    const txSize = transaction.vsize || transaction.size;
    return txSize ? transaction.fee / txSize : 0;
  },
);

export const getMinimumFeeRate = createSelector(
  [getOriginalFeeRate],
  (originalFeeRate) => Math.max(originalFeeRate + 1, 1),
);

export const getEstimatedNewFee = createSelector(
  [getFeeBumpTransaction, getSelectedFeeRate],
  (transaction, feeRate) => {
    if (!transaction || !feeRate) return 0;
    const txVsize = transaction.vsize || transaction.size || 250;
    return Math.ceil(txVsize * feeRate);
  },
);

export const getFeeDifference = createSelector(
  [getFeeBumpTransaction, getEstimatedNewFee],
  (transaction, estimatedNewFee) => {
    if (!transaction) return 0;
    return estimatedNewFee - transaction.fee;
  },
);

// Form validation selectors
export const getIsRbfFormValid = createSelector(
  [getRbfType, getCancelAddress, getSelectedFeeRate, getMinimumFeeRate],
  (rbfType, cancelAddress, selectedFeeRate, minimumFeeRate) => {
    if (selectedFeeRate < minimumFeeRate) return false;
    if (rbfType === "cancel" && !cancelAddress.trim()) return false;
    return true;
  },
);
