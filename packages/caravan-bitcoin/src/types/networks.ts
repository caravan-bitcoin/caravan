import { Network } from "../networks";

type NETWORKS_KEYS = keyof typeof Network;
export type BitcoinNetwork = (typeof Network)[NETWORKS_KEYS];
