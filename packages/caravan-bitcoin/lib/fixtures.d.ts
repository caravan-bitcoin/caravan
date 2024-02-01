/**
 * This module provides useful test fixtures.
 *
 * Most test fixtures are derived from the same BIP39 seed phrase
 * (which is also included as a fixture).
 *
 * Test transactions are multisig which allows them to have one of the
 * keys be the open source (private) key above and another be private
 * (private key).  This doubly-private key is held by Unchained
 * Capital.
 *
 * Multisig addresses built from both keys have the advantage that
 * they are open enough to test most aspects of transaction authoring
 * & signing while remaining impossible to spend from without having
 * the private (private) key.  This enables robust public tests of
 * multisig addresses in testnet and mainnet.
 *
 * All the fixtures in this module are accessible through the
 * `TEST_FIXTURES` constant.
 *
 * @module fixtures
 */
/// <reference types="node" />
import { Network } from "./networks";
export declare const ROOT_FINGERPRINT = "f57ec65d";
/**
 * A set of test fixtures mostly built from the same [BIP39 seed phrase]{@link https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki}.
 *
 * Initializing your keystore with this seed phrase will allow you to replicate many of the unit (and integration)
 * tests in this library on your hardware/software.  This is also useful for functional testing.
 *
 * Includes the following properties:
 * - `keys` - given the multisig nature of these fixtures, they involve keys from multiple sources
 * -   `open_source` - open source fixtures
 * -     `bip39Phrase` -- the BIP39 seed phrase used for all other fixtures
 * -     `nodes` -- an object mapping BIP32 paths to the corresponding [HD node]{@link module:fixtures.HDNode} derived from the BIP39 seed phrase above.
 * -   `unchained` - unchained fixtures
 * -     `nodes` -- an object mapping BIP32 paths to the corresponding [HD node]{@link module:fixtures.HDNode} derived from unchained seed phrase (not shared).
 * - `multisigs` -- an array of [multisig addresses]{@link module:fixtures.MultisigAddress} derived from the HD nodes above.
 * - `braids` -- an array of [braids]{@link module.braid.Braid} derived from the open_source + unchained HD nodes above.
 * - `transactions` -- an array of [transactions]{@link module:fixtures.MultisigTransaction} from the multisig address above.
 *
 * @example
 * import {TEST_FIXTURES} from "unchained-bitcoin";
 * console.log(TEST_FIXTURES.keys.open_source.bip39Phrase);
 * // merge alley lucky axis penalty manage latin gasp virus captain wheel deal chase fragile chapter boss zero dirt stadium tooth physical valve kid plunge
 *
 */
export declare const TEST_FIXTURES: {
    keys: {
        open_source: {
            bip39Phrase: string[];
            nodes: {};
        };
        unchained: {
            nodes: {};
        };
    };
    braids: {
        network: Network;
        addressType: string;
        extendedPublicKeys: {
            base58String: string;
            chaincode: string;
            depth: number;
            index: number;
            parentFingerprint: number;
            path: string;
            pubkey: string;
            rootFingerprint: string;
            version: string;
        }[];
        stringExtendedPublicKeys: string[];
        requiredSigners: number;
        index: string;
        pubKeySets: {
            index: {
                0: string[];
                1: string[];
                48349: string[];
            };
            path: {
                "0/0": string[];
            };
        };
        bip32Derivations: {
            index: {
                0: {
                    masterFingerprint: Buffer;
                    path: string;
                    pubkey: Buffer;
                }[];
                1: {
                    masterFingerprint: Buffer;
                    path: string;
                    pubkey: Buffer;
                }[];
                48349: {
                    masterFingerprint: Buffer;
                    path: string;
                    pubkey: Buffer;
                }[];
            };
            path: {
                "0/0": {
                    masterFingerprint: Buffer;
                    path: string;
                    pubkey: Buffer;
                }[];
            };
        };
    }[];
    multisigs: ({
        description: string;
        utxos: any[];
        transaction: {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        };
        multisig: {};
        braidAwareMultisig: {};
        multisigScript: any;
        multisigScriptOps: string | undefined;
        multisigScriptHex: string | undefined;
        network: Network;
        type: string;
        bip32Path: string;
        policyHmac: string;
        publicKey: string;
        publicKeys: string[];
        changePublicKeys: string[];
        redeemScriptOps: string;
        redeemScriptHex: string;
        scriptOps: string;
        scriptHex: string;
        address: string;
        bip32Derivation: {
            masterFingerprint: Buffer;
            path: string;
            pubkey: Buffer;
        }[];
        changeBip32Derivation: {
            masterFingerprint: Buffer;
            path: string;
            pubkey: Buffer;
        }[];
        braidDetails: {
            network: Network;
            addressType: string;
            extendedPublicKeys: {
                base58String: string;
                chaincode: string;
                depth: number;
                index: number;
                parentFingerprint: number;
                path: string;
                pubkey: string;
                rootFingerprint: string;
                version: string;
            }[];
            requiredSigners: number;
            index: string;
        };
        changeBraidDetails: {
            network: Network;
            addressType: string;
            extendedPublicKeys: {
                base58String: string;
                chaincode: string;
                depth: number;
                index: number;
                parentFingerprint: number;
                path: string;
                pubkey: string;
                rootFingerprint: string;
                version: string;
            }[];
            requiredSigners: number;
            index: string;
        };
        psbtNoChange: string;
        psbt: string;
        psbtWithGlobalXpub: string;
        psbtPartiallySigned: string;
        psbtOrderedPartiallySigned: string;
        witnessScriptOps?: undefined;
        witnessScriptHex?: undefined;
    } | {
        description: string;
        utxos: any[];
        transaction: {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        };
        multisig: {};
        braidAwareMultisig: {};
        multisigScript: any;
        multisigScriptOps: string | undefined;
        multisigScriptHex: string | undefined;
        network: Network;
        type: string;
        bip32Path: string;
        policyHmac: string;
        publicKey: string;
        publicKeys: string[];
        witnessScriptOps: string;
        witnessScriptHex: string;
        redeemScriptOps: string;
        redeemScriptHex: string;
        scriptOps: string;
        scriptHex: string;
        address: string;
        braidDetails: {
            network: Network;
            addressType: string;
            extendedPublicKeys: {
                base58String: string;
                chaincode: string;
                depth: number;
                index: number;
                parentFingerprint: number;
                path: string;
                pubkey: string;
                rootFingerprint: string;
                version: string;
            }[];
            requiredSigners: number;
            index: string;
        };
        psbtNoChange: string;
        psbt: string;
        psbtWithGlobalXpub: string;
        psbtPartiallySigned: string;
        changePublicKeys?: undefined;
        bip32Derivation?: undefined;
        changeBip32Derivation?: undefined;
        changeBraidDetails?: undefined;
        psbtOrderedPartiallySigned?: undefined;
    } | {
        description: string;
        utxos: any[];
        transaction: {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        };
        multisig: {};
        braidAwareMultisig: {};
        multisigScript: any;
        multisigScriptOps: string | undefined;
        multisigScriptHex: string | undefined;
        network: Network;
        type: string;
        bip32Path: string;
        policyHmac: string;
        publicKey: string;
        publicKeys: string[];
        witnessScriptOps: string;
        witnessScriptHex: string;
        scriptOps: string;
        scriptHex: string;
        address: string;
        braidDetails: {
            network: Network;
            addressType: string;
            extendedPublicKeys: {
                base58String: string;
                chaincode: string;
                depth: number;
                index: number;
                parentFingerprint: number;
                path: string;
                pubkey: string;
                rootFingerprint: string;
                version: string;
            }[];
            requiredSigners: number;
            index: string;
        };
        psbtNoChange: string;
        psbt: string;
        psbtWithGlobalXpub: string;
        psbtPartiallySigned: string;
        changePublicKeys?: undefined;
        redeemScriptOps?: undefined;
        redeemScriptHex?: undefined;
        bip32Derivation?: undefined;
        changeBip32Derivation?: undefined;
        changeBraidDetails?: undefined;
        psbtOrderedPartiallySigned?: undefined;
    } | {
        description: string;
        utxos: any[];
        transaction: {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        } | {
            outputs: any[];
            hex: string;
            signature: string[];
            byteCeilingSignature: string[];
        };
        multisig: {};
        braidAwareMultisig: {};
        multisigScript: any;
        multisigScriptOps: string | undefined;
        multisigScriptHex: string | undefined;
        network: Network;
        type: string;
        bip32Path: string;
        policyHmac: string;
        publicKey: string;
        publicKeys: string[];
        redeemScriptOps: string;
        redeemScriptHex: string;
        scriptOps: string;
        scriptHex: string;
        address: string;
        braidDetails: {
            network: Network;
            addressType: string;
            extendedPublicKeys: {
                base58String: string;
                chaincode: string;
                depth: number;
                index: number;
                parentFingerprint: number;
                path: string;
                pubkey: string;
                rootFingerprint: string;
                version: string;
            }[];
            requiredSigners: number;
            index: string;
        };
        psbtNoChange: string;
        psbt: string;
        psbtWithGlobalXpub: string;
        psbtPartiallySigned: string;
        changePublicKeys?: undefined;
        bip32Derivation?: undefined;
        changeBip32Derivation?: undefined;
        changeBraidDetails?: undefined;
        psbtOrderedPartiallySigned?: undefined;
        witnessScriptOps?: undefined;
        witnessScriptHex?: undefined;
    })[];
    transactions: any[];
};
/**
 * An HD node fixture derived from the BIP39 seed phrase fixture.
 *
 * Not all HD node fixtures have all properties below.
 *
 * @typedef HDNode
 * @type {Object}
 * @property {string} pub - the (compressed) public key in hex
 * @property {string} xpub - the extended public key formatted for mainnet
 * @property {string} tpub - the extended public key formatted for testnet
 */
/**
 * A multisig address fixture.  At least one of the public
 * keys in the redeem/witness script for each address is derived from
 * the BIP39 seed phrase fixture.
 *
 * @typedef MultisigAddress
 * @type {Object}
 * @property {module:networks.NETWORKS} network - bitcoin network
 * @property {module:multisig.MULTISIG_ADDRESS_TYPES} type - multisig address type
 * @property {string} description - describes the multisig address
 * @property {string} bip32Path - BIP32 derivation path to the public key used in this address from the BIP39 seed phrase fixture
 * @property {string} publicKey - (compressed) public key (in hex) corresponding to BIP32 path
 * @property {string[]} publicKeys - (compressed) public keys (in hex) (order matters)
 * @property {string} multisigScriptHex - multisig script in hex (redeem/witneess script as appropriate)
 * @property {string} multisigScriptOps - multisig script in opcodes (redeem/witneess script as appropriate)
 * @property {string} redeemScriptHex - redeem script in hex (missing for P2WSH)
 * @property {string} redeemScriptOps - redeem script in opcodes (missing for P2WSH)
 * @property {string} witnessScriptHex - witness script in hex (missing for P2SH)
 * @property {string} witnessScriptOps - witness script in opcodes (missing for P2SH)
 * @property {string} address - bitcoin address
 * @property {string} scriptHex - script in hex
 * @property {string} scriptOps - script in opcodes
 * @property {module:multisig.Multisig} multisig - `Multisig` object for address
 * @property {module:transactions.UTXO[]} utxos - UTXOs at this address
 * @property {module.braid.Braid} braidDetails - details to construct the braid where this Multisig address resides
 * @property {module.braid.Braid} changeBraidDetails - details to construct the change braid where the Change Multisig address resides (if needed)
 * @property {string} psbt - unsigned psbt of the Transaction
 * @property {string} psbtPartiallySigned - psbt that has a single set of signatures inside for the open source words
 *
 */
/**
 * A transaction fixture with inputs from one or more multisig
 * addresses.
 *
 * Each address contains at least one public key derived from the
 * BIP39 seed phrase fixture.
 *
 * The signatures in these transaction fixtures can therefore be
 * created by any keystore which loads this seed phrase.
 *
 * The inputs to these transactions should survive as the other
 * signature(s) required to spend them cannot be produced publicly
 * (their private keys are held by Unchained Capital).
 *
 * @typedef MultisigTransaction
 * @type {Object}
 * @property {string} description - describes the transaction
 * @property {module:networks.NETWORKS} network - bitcoin network
 * @property {boolean} segwit - does the transaction have segwit inputs?
 * @property {string[]} bip32Paths - BIP32 paths to the public key derived from the BIP39 seed phrase fixture, one per input
 * @property {string[]} publicKeys - (compressed) public keys  (in hex) corresponding to each BIP32 path, one per input
 * @property {module:transactions.UTXO[]} inputs - transaction inputs
 * @property {module:transactions.TransactionOutput[]} outputs - transaction outputs
 * @property {string} hex - unsigned transaction in hex
 * @property {string[]} signature - one signature for the transaction (consisting of one signature per input)
 *
 */
