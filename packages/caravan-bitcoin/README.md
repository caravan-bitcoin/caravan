# Unchained Capital Bitcoin Utilities

[![Build Status](https://travis-ci.com/unchained-capital/@caravan/bitcoin.svg?branch=master)](https://travis-ci.com/unchained-capital/@caravan/bitcoin)

This library builds on the excellent
[bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib), adding
valuable but missing functionality for validation, HD wallets, block
explorers, and especially multisig.

Full API documentation can be found at
[@caravan/bitcoin](https://unchained-capital.github.io/@caravan/bitcoin).

This library was built and is maintained by [Unchained
Capital](https://www.unchained-capital.com).

## Installation

`@caravan/bitcoin` is distributed as an NPM package. Add it to your
application's dependencies:

```
$ npm install --save @caravan/bitcoin
```

## Usage

The library provides a functional API which builds upon data
structures used by `bitcoinjs-lib`.

In particular, many functions accept a `Multisig` object which is the
type name given by this library to the kind of object returned by
functions such as `bitcoin.payments.p2ms`, `bitcoin.payments.p2sh`,
&c. from `bitcoinjs-lib`.

The examples below provide an initial idea of how to use this library.

### Interacting with a multisig address.

#### Generating multisigs

`Multisig` objects can be generated with two functions:

- `generateMultisigFromPublicKeys` -- useful when directly passing public keys
- `generateMultisigFromHex` -- useful when parsing an existing redeem/witness script

Each of these functions accepts additional arguments which determines
the multisig address type (e.g. P2SH or P2WSH).

```javasacript
import {
	generateMultisigFromPublicKeys,
	generateMultisigFromHex,
	P2SH,                      // or: P2SH_P2WSH, P2WSH,
	TESTNET,                   // or: MAINNET,
	multisigAddress,
} from "@caravan/bitcoin";

// Public keys are represented as compressed hex.
const publicKeys = [
  "02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4",
  "03938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba",
];

// A testnet P2SH 2-of-2 multisig.
const m1 = generateMultisigFromPublicKeys(TESTNET, P2SH, 2, ...publicKeys);
console.log(multisigAddress(m1))
// 2N5KgAnFFpmk5TRMiCicRZDQS8FFNCKqKf1

const redeemScript = "522102a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d42103938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba52ae";
// Same as m1 but using redeem script
const m2 = generateMultisigFromHex(TESTNET, P2SH, redeemScript);
console.log(multisigAddress(m2))
// 2N5KgAnFFpmk5TRMiCicRZDQS8FFNCKqKf1
```

#### Querying multisigs

`Multisig` objects can be passed around and queried with other
functions in the API.

```javascript
multisigAddress(multisig); // Returns public address
multisigAddressType(multisig); // P2SH
multisigRequiredSigners(multisig); // 2
multisigTotalSigners(multisig); // 3
multisigScript(multisig); // Returns redeem OR witness script, as appropriate
multisigRedeemScript(multisig); // Returns redeem script in hex (null for P2WSH)
multisigWitnessScript(multisig); // Returns witness script in hex (null for P2SH)
multisigPublicKeys(multisig); // Returns publicKeys
```

#### Multisig Transactions

`Multisig` objects can be used to draft signed or unsigned
transactions and to validate transaction signatures.

```javascript
import {
  generateMultisigFromPublicKeys,
  TESTNET,
  P2SH,
  unsignedMultisigTransaction,
  validateMultisigSignature,
} from "@caravan/bitcoin";
// Spending 3 UTXOs from the same multisig address.

// First build the multisig for the address.
const publicKeys = [
  "02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4",
  "03938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba",
];
const multisig = generateMultisigFromPublicKeys(
  TESTNET,
  P2SH,
  2,
  ...publicKeys,
);

// All 3 UTXOs are at the same address so get decorated with the same multisig object.
const inputs = [
  {
    txid: "65e7ef764030dabfb46e3ae1c357b0666d0dda722c9809fb73245d6d68665284",
    index: 1,
    multisig,
  },
  {
    txid: "ae9e1aa8312e102e806fa11d8e65965a624f88459e6bb5bcf48156a0c53e022a",
    index: 1,
    multisig,
  },
  {
    txid: "f243c1fbb85dd49da91477b89c76636202721be9c7df5ee6eee0c6a10861ae44",
    index: 0,
    multisig,
  },
];

const outputs = [
  {
    address: "2NE1LH35XT4YrdnEebk5oKMmRpGiYcUvpNR",
    amountSats: 291590,
  },
];

const unsignedTransaction = unsignedMultisigTransaction(
  TESTNET,
  inputs,
  outputs,
);

// Pass the above unsigned transaction to some keystore device/software to obtain a signature.
//
// One signature value per input.
const transactionSignature1 = [
  "304402205397795a8b6e0b8d1c5a0b2b5b8fb8e49afb6dd150d1a186604fa9e71e23aaa20220514b7b7ed9ec43d983d7be5ea4ece5a55b29efa2193d90bf1fd087356fcbd54b",
  "304402200ffcb2331655f1f24bf2f7e16984d81310e55d47c405b45e327abde524c8d31e022036460b70a665d1756ea91e131a1ed1022544dfdd2232f64117230d22f9deeb08",
  "30440220167a35bccf4bb13073e8c66a1b094906d5c7879d6cdac730e435aef196d2f3eb02205a39e05763e511dc15deff56fa29eead850623076fda8a5e173dd0942197aaf4",
];

// Signatures can be validated.
transactionSignature1.forEach((inputSignature, inputIndex) => {
  const result = validateMultisigSignature(
    unsignedTransaction,
    inputIndex,
    inputs[inputIndex],
    inputSignature,
  );
  if (!result) {
    console.error(`Invalid signature for input ${inputIndex + 1}`);
  }
});

// Get the second required signature.
const transactionSignature2 = ["304a...", "304b...", "304c..."];

// Combine signatures into a fully signed transaction.
const signedTransaction = signedMultisigTransaction(
  TESTNET,
  inputs,
  outputs,
  transactionSignature1,
  transactionSignature2,
);

// Broadcast this transaction somehow...
console.log(signedTransaction.tHex());
```

### Validation

This library contains several useful functions for validation not
provided by `bitcoinjs-lib` or other libraries. The validation
functions are designed to return an empty string `''` on valid input
and provide a helpful error message otherwise.

- `validateAddress` -- understands Bech32 addresses and is aware of
  differences in addresses across networks

- `valdiateBIP32Path` -- understands absolute and relative BIP32
  paths, validates maximum BIP32 index values, and can optionally
  check for fully hardened or unhardened paths

- `validateExtendedPublicKey` -- understands network-dependent
  differences in encoding extended public keys

- `validatePublicKey` -- allows any hexadecimal value

- `validateFeeRate` -- implements a reasonable maximum fee rate in
  Satoshis/byte

- `validateFee` -- implements a reasonable maximum fee in BTC

- `validateOutputAmount` -- checks for dust and that amount is less
  than total input amount

- `validateMultisigSignature` -- checks signatures for correctness and
  works across all multisig address types

## Developers

### Troubleshooting and FAQ

#### `bitcoinjs-lib-v5`

This is to make sure that the legacy caravan/bitcoin functions
use the legacy bitcoinjs-lib when being built in caravan/coordinator.

Learn more [here](https://github.com/vitejs/vite/issues/4245),
[here](https://github.com/zackerydev/noist?tab=readme-ov-file), and
[here](https://github.com/prisma/prisma/issues/9649).

### Contributing

Unchained Capital welcomes bug reports, new features, and better documentation for this library.

If you are fixing a bug or adding a feature, please first check the [GitHub issues page](https://github.com/caravan-bitcoin/caravan/issues) to see if there is any existing discussion about it.

To contribute, create a pull request (PR) on GitHub against the [main fork of @caravan/bitcoin](https://github.com/caravan-bitcoin/caravan/).

Before you submit your PR, make sure to update and run the test suite!
