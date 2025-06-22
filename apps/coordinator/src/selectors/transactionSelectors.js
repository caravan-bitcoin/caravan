// Helper functions to pull data from Redux state
// These handle cases where the state might not be fully loaded yet

export const getFeeRate = (state) => {
  // Try a few different places where fee rate might be stored
  // Fall back to 1 sat/vB if nothing is set
  return state.spend?.feeRate || state.transaction?.feeRate || 1;
};

export const getSelectedUTXOs = (state) => {
  // Get the currently selected UTXOs for spending
  return state.spend?.utxos || [];
};

export const getTransactionOutputs = (state) => {
  // Grab the outputs we're sending to
  return state.spend?.outputs || [];
};

export const getWalletConfig = (state) => {
  // Pull wallet configuration settings
  return state.wallet?.config || {};
};