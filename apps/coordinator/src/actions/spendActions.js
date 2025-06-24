export const SET_SPEND_UTXOS = "SET_SPEND_UTXOS";

export const setSpendUTXOs = (wallet) => (dispatch, getState) => {
  const { client } = getState();
  return client
    .fetchUTXOsForWallet(wallet)
    .then((utxos) => {
      const utxosWithScriptType = utxos.map((utxo) => ({
        ...utxo,
        scriptType: wallet.addressType,
      }));
      dispatch({ type: SET_SPEND_UTXOS, utxos: utxosWithScriptType });
      // dispatch(setUTXOsLoading(false));
    })
    .catch((err) => {
      // TODO: Add user notification or error reporting here if needed
      console.error("Failed to fetch UTXOs for wallet:", err);
    });
};
