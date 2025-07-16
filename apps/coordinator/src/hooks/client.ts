import { BlockchainClient } from "@caravan/clients";
import { setBlockchainClient } from "../actions/clientActions";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "reducers";
import { useEffect } from "react";

export const useGetClient = (): BlockchainClient => {
  const dispatch = useDispatch();
  const client = useSelector((state: RootState) => state.client);
  const network = useSelector((state: RootState) => state.settings.network);
  const blockchainClient = useSelector(
    (state: RootState) => state.client.blockchainClient,
  );
  console.log("network",network)
  console.log("client",client)
  useEffect(() => {
    dispatch(setBlockchainClient());
  }, [
    client.type,
    client.url,
    client.username,
    client.password,
    client.walletName,
    network,
  ]);
  return blockchainClient;
};
