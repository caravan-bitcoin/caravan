import { createSelector } from "reselect";

// Type definitions for the Redux state
interface UTXO {
  amountSats: string;
  confirmed: boolean;
  time: number;
  txid?: string;
}

interface Slice {
  utxos: UTXO[];
  addressUsed: boolean;
  addressKnown: boolean;
  change?: boolean;
  balanceSats: {
    isEqualTo: (value: number) => boolean;
    isGreaterThan: (value: number) => boolean;
  };
  multisig: {
    address: string;
  };
  lastUsed?: string;
  lastUsedTime?: number;
}

interface ExtendedPublicKeyImporter {
  name: string;
  method: string;
  bip32Path: string;
  extendedPublicKey: string;
  rootXfp: string;
}

interface LedgerPolicyHmac {
  xfp: string;
  policyHmac: string;
}

interface WalletState {
  wallet: {
    deposits: {
      nodes: Record<string, Slice>;
    };
    change: {
      nodes: Record<string, Slice>;
    };
    common: {
      walletName: string;
      walletUuid: string;
      ledgerPolicyHmacs: LedgerPolicyHmac[];
    };
  };
  settings: {
    addressType: string;
    network: string;
    totalSigners: number;
    requiredSigners: number;
    startingAddressIndex: number;
  };
  quorum: {
    extendedPublicKeyImporters: Record<string, ExtendedPublicKeyImporter>;
  };
  client: {
    type: string;
    url?: string;
    username?: string;
    walletName?: string;
    provider?: string;
    blockchainClient?: {
      type: string;
    };
  };
}

// convert slice objects to array of slice values
// only care about inbound to deposit account, not change
const getDepositSlices = (state: WalletState): Slice[] =>
  Object.values(state.wallet.deposits.nodes);
const getWalletSlices = (state: WalletState): Slice[] => [
  ...Object.values(state.wallet.deposits.nodes),
  ...Object.values(state.wallet.change.nodes),
];

const getAddressType = (state: WalletState): string =>
  state.settings.addressType;
const getNetwork = (state: WalletState): string => state.settings.network;
const getTotalSigners = (state: WalletState): number =>
  state.settings.totalSigners;
const getRequiredSigners = (state: WalletState): number =>
  state.settings.requiredSigners;
const getStartingAddressIndex = (state: WalletState): number =>
  state.settings.startingAddressIndex;
const getWalletName = (state: WalletState): string =>
  state.wallet.common.walletName;
const getWalletUuid = (state: WalletState): string =>
  state.wallet.common.walletUuid;
const getExtendedPublicKeyImporters = (
  state: WalletState,
): Record<string, ExtendedPublicKeyImporter> =>
  state.quorum.extendedPublicKeyImporters;
const getWalletLedgerPolicyHmacs = (state: WalletState): LedgerPolicyHmac[] =>
  state.wallet.common.ledgerPolicyHmacs;

const getClientDetails = (state: WalletState): string => {
  if (state.client.type === "private") {
    return `{
    "type": "private",
    "url": "${state.client.url}",
    "username": "${state.client.username}",
    "walletName": "${state.client.walletName}"
  }`;
  }
  if (state.client.type === "public") {
    return `{
    "type": "public",
    "provider": "${state.client.provider}"
  }`;
  }
  return `{
    "type": "${state.client.type}"
  }`;
};

const extendedPublicKeyImporterBIP32Path = (
  state: WalletState,
  number: number,
): string => {
  const { extendedPublicKeyImporters } = state.quorum;
  const extendedPublicKeyImporter = extendedPublicKeyImporters[number];
  const bip32Path =
    extendedPublicKeyImporter.method === "text"
      ? "Unknown (make sure you have written this down previously!)"
      : extendedPublicKeyImporter.bip32Path;
  const rootFingerprint =
    extendedPublicKeyImporter.rootXfp === "Unknown"
      ? "00000000"
      : extendedPublicKeyImporter.rootXfp;
  return extendedPublicKeyImporter.method === "unknown"
    ? `    {
        "name": "${extendedPublicKeyImporter.name}",
        "bip32Path": "${bip32Path}",
        "xpub": "${extendedPublicKeyImporter.extendedPublicKey}",
        "xfp" : "${rootFingerprint}"
        }`
    : `    {
        "name": "${extendedPublicKeyImporter.name}",
        "bip32Path": "${bip32Path}",
        "xpub": "${extendedPublicKeyImporter.extendedPublicKey}",
        "xfp" : "${rootFingerprint}",
        "method": "${extendedPublicKeyImporter.method}"
      }`;
};

const getExtendedPublicKeysBIP32Paths = (state: WalletState): string => {
  const totalSigners = getTotalSigners(state);
  const extendedPublicKeyImporterBIP32Paths: string[] = [];
  for (let i = 1; i <= totalSigners; i += 1) {
    extendedPublicKeyImporterBIP32Paths.push(
      `${extendedPublicKeyImporterBIP32Path(state, i)}${
        i < totalSigners ? "," : ""
      }`,
    );
  }
  return extendedPublicKeyImporterBIP32Paths.join("\n");
};

/**
 * @description cycle through all slices to calculate total balance of all utxos
 * from all slices including pending.
 */
export const getTotalBalance = createSelector(
  getWalletSlices,
  (slices: Slice[]): number => {
    return slices.reduce((balance: number, slice: Slice) => {
      const sliceTotal = slice.utxos.reduce((total: number, utxo: UTXO) => {
        return total + parseInt(utxo.amountSats, 10);
      }, 0);
      return balance + sliceTotal;
    }, 0);
  },
);

export const getPendingBalance = createSelector(
  getDepositSlices,
  // iterate through all slices to add up the pending balance
  (slices: Slice[]): number => {
    // reduce slices to calculate unconfirmed utxos from each slice
    return slices.reduce((balance: number, currentSlice: Slice) => {
      // if the current slice has no UTXOs, then continue
      if (!currentSlice.utxos.length) return balance;
      // otherwise, loop through available utxos and add balance of those
      // that are unconfirmed
      const sliceBalance = currentSlice.utxos.reduce(
        (total: number, utxo: UTXO) => {
          if (!utxo.confirmed) return total + parseInt(utxo.amountSats, 10);
          return total;
        },
        0,
      );

      // add slice's pending balance to aggregated balance
      return sliceBalance + balance;
    }, 0);
  },
);

/**
 * @description selector that subtracts pending balance (calculated with
 * other selector) from total balance of each braid which is stored in the state
 */
export const getConfirmedBalance = createSelector(
  [getTotalBalance, getPendingBalance],
  (totalBalance: number, pendingBalance: number): number =>
    totalBalance - pendingBalance,
);

interface SliceWithLastUsed extends Slice {
  lastUsed?: string;
  lastUsedTime?: number;
}

/**
 * @description Returns a selector with all slices from both deposit and change braids
 * also adds a "lastUsed" property for each slice
 */
export const getSlicesWithLastUsed = createSelector(
  getWalletSlices,
  (slices: Slice[]): SliceWithLastUsed[] => {
    return slices.map((slice: Slice): SliceWithLastUsed => {
      if (!slice.utxos.length && slice.addressUsed)
        return { ...slice, lastUsed: "Spent" };

      // if no utxos and no recorded balanceSats then just return the slice unchanged
      if (!slice.utxos.length && slice.balanceSats.isEqualTo(0)) return slice;

      // find the last UTXO time for the last used time for that slice
      const maxtime = Math.max(...slice.utxos.map((utxo: UTXO) => utxo.time));

      // if no max was able to be found, but we still have a balanceSats
      // then we can can assume the utxo is pending
      if (
        Number.isNaN(maxtime) ||
        (slice.balanceSats.isGreaterThan(0) && !slice.utxos.length)
      )
        return { ...slice, lastUsed: "Pending" };
      return {
        ...slice,
        lastUsed: new Date(1000 * maxtime).toLocaleDateString(),
        lastUsedTime: maxtime,
      };
    });
  },
);

/**
 * Gets the set of spendable slices, i.e. ones that don't have a
 * pending utxo and are not spent
 */
export const getSpendableSlices = createSelector(
  getSlicesWithLastUsed,
  (slices: SliceWithLastUsed[]): SliceWithLastUsed[] => {
    return slices.filter(
      (slice: SliceWithLastUsed) =>
        // pending change is considered spendable
        (slice.lastUsed !== "Pending" || slice.change) &&
        slice.lastUsed !== "Spent" &&
        slice.utxos.length,
    );
  },
);

/**
 * @description Returns a selector that provides all spent slices, i.e.
 * All slices that have been used but have no balance left.
 */
export const getSpentSlices = createSelector(
  getSlicesWithLastUsed,
  (slices: SliceWithLastUsed[]): SliceWithLastUsed[] =>
    slices.filter(
      (slice: SliceWithLastUsed) =>
        slice.addressUsed && slice.balanceSats.isEqualTo(0),
    ),
);

/**
 * @description Returns a selector that provides all slices with an active balance
 */
export const getSlicesWithBalance = createSelector(
  getSlicesWithLastUsed,
  (slices: SliceWithLastUsed[]): SliceWithLastUsed[] =>
    slices.filter((slice: SliceWithLastUsed) =>
      slice.balanceSats.isGreaterThan(0),
    ),
);

/**
 * @description Returns a selector that provides all unused slices,
 * i.e. where the balance is zero and the address has not been used
 */
export const getZeroBalanceSlices = createSelector(
  getSlicesWithLastUsed,
  (slices: SliceWithLastUsed[]): SliceWithLastUsed[] =>
    slices.filter(
      (slice: SliceWithLastUsed) =>
        slice.balanceSats.isEqualTo(0) && !slice.addressUsed,
    ),
);

/**
 * @description Returns a selector of all wallet slices
 * where the status of that slice is not known.
 */
export const getUnknownAddressSlices = createSelector(
  getWalletSlices,
  (slices: Slice[]): Slice[] =>
    slices.filter((slice: Slice) => !slice.addressKnown),
);

/**
 * @description returns an array of all addresses of slices
 * where the state of that slice is not known
 */
export const getUnknownAddresses = createSelector(
  [getWalletSlices, getUnknownAddressSlices],
  (slices: Slice[]): string[] =>
    slices.map((slice: Slice) => slice.multisig.address),
);

/**
 * @description Returns a selector of all slices from the _deposit_ braid
 * where the address hasn't been used yet.
 */
export const getDepositableSlices = createSelector(
  getDepositSlices,
  (slices: Slice[]): Slice[] =>
    slices.filter(
      (slice: Slice) => slice.balanceSats.isEqualTo(0) && !slice.addressUsed,
    ),
);

/**
 * @description Returns a selector of the text needed to construct a wallet
 * details file.
 */
export const getWalletDetailsText = createSelector(
  [
    getWalletName,
    getWalletUuid,
    getAddressType,
    getNetwork,
    getClientDetails,
    getRequiredSigners,
    getTotalSigners,
    getExtendedPublicKeysBIP32Paths,
    getStartingAddressIndex,
    getWalletLedgerPolicyHmacs,
  ],
  (
    walletName: string,
    walletUuid: string,
    addressType: string,
    network: string,
    clientDetails: string,
    requiredSigners: number,
    totalSigners: number,
    extendedPublicKeys: string,
    startingAddressIndex: number,
    ledgerPolicyHmacs: LedgerPolicyHmac[] = [],
  ): string => {
    return `{
  "name": "${walletName}",
  "uuid": "${walletUuid}",
  "addressType": "${addressType}",
  "network": "${network}",
  "client":  ${clientDetails},
  "quorum": {
    "requiredSigners": ${requiredSigners},
    "totalSigners": ${totalSigners}
  },
  "extendedPublicKeys": [
    ${extendedPublicKeys}
  ],
  "startingAddressIndex": ${startingAddressIndex},
  "ledgerPolicyHmacs": [${ledgerPolicyHmacs.map((hmac: LedgerPolicyHmac) => JSON.stringify(hmac)).join(", ")}]
}`;
  },
);

export const getWalletConfig = createSelector(
  [getWalletDetailsText],
  (walletDetailsText: string) => JSON.parse(walletDetailsText),
);

interface HmacWithName {
  policyHmac: string;
  name: string;
}

export const getHmacsWithName = createSelector(
  getExtendedPublicKeyImporters,
  getWalletLedgerPolicyHmacs,
  (
    extendedPublicKeys: Record<string, ExtendedPublicKeyImporter>,
    policyHmacs: LedgerPolicyHmac[],
  ): HmacWithName[] => {
    return Object.values(extendedPublicKeys)
      .map((importer: ExtendedPublicKeyImporter) => {
        const policyHmac = policyHmacs.find(
          (hmac: LedgerPolicyHmac) => hmac.xfp === importer.rootXfp,
        )?.policyHmac;
        return { policyHmac, name: importer.name };
      })
      .filter(
        (registration: {
          policyHmac?: string;
          name: string;
        }): registration is HmacWithName => Boolean(registration.policyHmac),
      );
  },
);

/**
 * @description Returns an array of all wallet addresses from both deposit and change nodes
 */
export const getWalletAddresses = createSelector(
  getWalletSlices,
  (slices: Slice[]): string[] => {
    return slices
      .map((slice: Slice) => slice.multisig?.address)
      .filter(Boolean) as string[];
  },
);

/**
 * @description Returns an array of transaction IDs from unconfirmed UTXOs (pending transactions only)
 */
export const getPendingTransactionIds = createSelector(
  getWalletSlices,
  (slices: Slice[]): string[] => {
    const txids = new Set<string>();

    slices.forEach((slice: Slice) => {
      if (slice.utxos && slice.utxos.length > 0) {
        slice.utxos.forEach((utxo: UTXO) => {
          // Only include transaction IDs from unconfirmed UTXOs
          if (utxo.txid && !utxo.confirmed) {
            txids.add(utxo.txid);
          }
        });
      }
    });

    return Array.from(txids);
  },
);

/**
 * @description Returns the appropriate block explorer URL for a transaction based on network and client
 */
export const getTransactionExplorerUrl = createSelector(
  [getNetwork, (state: WalletState) => state.client],
  (network: string, client: WalletState["client"]) => {
    return (txid: string): string => {
      // Determine which block explorer to use based on the blockchain client type
      let explorerUrl = `https://blockstream.info/${network === "mainnet" ? "" : "testnet/"}tx/${txid}`;

      if (client.blockchainClient?.type) {
        const clientType = client.blockchainClient.type;
        if (clientType === "mempool") {
          explorerUrl = `https://${network === "mainnet" ? "" : "testnet."}mempool.space/tx/${txid}`;
        } else if (clientType === "blockstream") {
          explorerUrl = `https://blockstream.info/${network === "mainnet" ? "" : "testnet/"}tx/${txid}`;
        }
      }

      return explorerUrl;
    };
  },
);
