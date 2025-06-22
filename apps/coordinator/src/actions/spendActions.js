// spendActions.js
// ----------------
// Redux action creators for spending-related state in the Caravan wallet.

export const setFeeRate = (feeRate) => ({
  type: 'SET_FEE_RATE',
  feeRate
});

export const analyzeTransaction = (analysis) => ({
  type: 'ANALYZE_TRANSACTION',
  analysis
});

/**
 * Fetch UTXOs for a wallet and dispatch them to the store.
 * Adds the script type to each UTXO for downstream use.
 */
export const setSpendUTXOs = (wallet) => (dispatch) => {
  return client
    .fetchUTXOsForWallet(wallet)
    .then((utxos) => {
      const utxosWithScriptType = utxos.map((utxo) => ({
        ...utxo,
        scriptType: wallet.addressType,
      }));
      dispatch({ type: SET_SPEND_UTXOS, utxos: utxosWithScriptType });
      dispatch(setUTXOsLoading(false));
    })
    .catch((err) => {
      // TODO: Add user notification or error reporting here if needed
      console.error("Failed to fetch UTXOs for wallet:", err);
    });
}; 