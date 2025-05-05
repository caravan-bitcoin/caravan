# Caravan PSBT

A set of utilities for working with PSBTs.

# Table of contents
- [Constants](#constants)
  - [Exports](#exports)
    - [`const PSBT_MAGIC_HEX`](#const-psbt_magic_hex)
    - [`const PSBT_MAGIC_B64`](#const-psbt_magic_b64)
    - [`const PSBT_MAGIC_BYTES`](#const-psbt_magic_bytes)
- [PSBTv0](#psbtv0)
- [PSBTv2](#psbtv2)
  - [Exports](#exports-1)
    - [`class PsbtV2`](#class-psbtv2)
      - [`get isReadyForConstructor`](#get-isreadyforconstructor)
      - [`get isReadyForUpdater`](#get-isreadyforupdater)
      - [`get isReadyForSigner`](#get-isreadyforsigner)
      - [`get isReadyForCombiner`](#get-isreadyforcombiner)
      - [`get isReadyForInputFinalizer`](#get-isreadyforinputfinalizer)
      - [`get isReadyForTransactionExtractor`](#get-isreadyfortransactionextractor)
      - [`get nLockTime`](#get-nlocktime)
      - [`public dangerouslySetGlobalTxVersion1`](#public-dangerouslysetglobaltxversion1)
      - [`public addGlobalXpub`](#public-addglobalxpub)
      - [`public addInput`](#public-addinput)
      - [`public addOutput`](#public-addoutput)
      - [`public deleteInput`](#public-deleteinput)
      - [`public deleteOutput`](#public-deleteoutput)
      - [`public addPartialSig`](#public-addpartialsig)
      - [`public removePartialSig`](#public-removepartialsig)
      - [`public setProprietaryValue`](#public-setproprietaryvalue)
      - [`static PsbtV2.FromV0`](#static-psbtv2fromv0)
    - [`function getPsbtVersionNumber`](#function-getpsbtversionnumber)
- [Concepts](#concepts)
  - [The operator role saga](#the-operator-role-saga)
- [TODO](#todo)
  - [PsbtV2](#psbtv2-1)
    - [Operator role validation](#operator-role-validation)
    - [Class constructor](#class-constructor)
    - [Add input timelocks](#add-input-timelocks)
    - [Add input sighash\_single](#add-input-sighash_single)

## Constants
### Exports

#### `const PSBT_MAGIC_HEX`

A utility constant for hex encoded psbt magic bytes equal to `"70736274ff"`.

#### `const PSBT_MAGIC_B64`

A utility constant for base64 encoded psbt magic bytes equal to `"cHNidP8"`.

#### `const PSBT_MAGIC_BYTES`

A utility constant for `Buffer` instance of psbt magic bytes.


## PSBTv0

[BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)




## PSBTv2

The `psbtv2` module provides utilities for working with v2 PSBTs and transformations or conversions between v0 and v2.

### Exports

#### `class PsbtV2`

An object class representing a PSBTv2 and its current state. While not yet complete, this class aims to also provide sufficient checking to ensure only valid PSBTs are represented and that only valid actions may be taken per operator role.

Getters and setters are provided for the keytypes defined in [BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki) and [BIP 370](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki). These getters/setters are named after the keytype in ALL_CAPS_SNAKE like `PsbtV2.PSBT_GLOBAL_VERSION`. Additional getters/setters may be listed in the following API documentation.

##### `get isReadyForConstructor`

A getter to check readiness for an operator role. Operator roles are defined in [BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#user-content-Roles) and [BIP 370](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#user-content-Roles).

Returns `true` if the PsbtV2 is ready for an operator taking the Constructor role.

This check assumes that the Creator used this class's constructor method to initialize the PsbtV2 without passing a psbt (constructor defaults were set).

##### `get isReadyForUpdater`

A getter to check readiness for an operator role. Operator roles are defined in [BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#user-content-Roles) and [BIP 370](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#user-content-Roles).

Returns `true` if the PsbtV2 is ready for an operator taking the Updater role.

Before signatures are added, but after an input is added, a PsbtV2 is likely to be ready for Constructor, ready for Updater, and ready for Signer simultaneously.

According to BIP370, the Updater can modify the sequence number, but it is unclear if the Updater retains permissions provided in psbtv0 (BIP174). It is likely not the case that the Updater has the same permissions as previously because it seems to now be the realm of the Constructor to add inputs and outputs.

##### `get isReadyForSigner`

A getter to check readiness for an operator role. Operator roles are defined in [BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#user-content-Roles) and [BIP 370](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#user-content-Roles).

Returns `true` if the PsbtV2 is ready for an operator taking the Signer role.

Right now, this method only checks for two things: There is an input for signing and `this.isReadyForTransactionExtractor === false`. The point of the latter is to check that the PsbtV2 has not been finalized.

A future improvement to this method might be to more thoroughly check inputs to determine if the PsbtV2 does or does not need to collect more signatures.

##### `get isReadyForCombiner`

A getter to check readiness for an operator role. Operator roles are defined in [BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#user-content-Roles) and [BIP 370](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#user-content-Roles).

Returns `true` if the PsbtV2 is ready for an operator taking the Combiner role.

Since a Combiner can potentially provide everything needed to a mostly blank PsbtV2, instances of a PsbtV2 are likely to return true as long as inputs have not been finalized.

##### `get isReadyForInputFinalizer`

A getter to check readiness for an operator role. Operator roles are defined in [BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#user-content-Roles) and [BIP 370](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#user-content-Roles).

Callable, but unimplemented. Returns `undefined`.

##### `get isReadyForTransactionExtractor`

A getter to check readiness for an operator role. Operator roles are defined in [BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#user-content-Roles) and [BIP 370](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#user-content-Roles).

Returns `true` if the PsbtV2 is ready for an operator taking the Transaction Extractor role.

If all the inputs have been finalized, then the psbt is ready for the Transaction Extractor. According to BIP 174, it's the responsibility of the Input Finalizer to add scriptSigs or scriptWitnesses and then remove other details besides the UTXO. This getter checks that the Input Finalizer has finished its job.

##### `get nLockTime`

Returns the `nLockTime` field for the psbt as if it were a bitcoin transaction.

From BIP 370:

> The nLockTime field of a transaction is determined by inspecting the `PSBT_GLOBAL_FALLBACK_LOCKTIME` and each input's `PSBT_IN_REQUIRED_TIME_LOCKTIME` and `PSBT_IN_REQUIRED_HEIGHT_LOCKTIME` fields. If none of the inputs have a `PSBT_IN_REQUIRED_TIME_LOCKTIME` and \*(or) `PSBT_IN_REQUIRED_HEIGHT_LOCKTIME`, then `PSBT_GLOBAL_FALLBACK_LOCKTIME` must be used. If `PSBT_GLOBAL_FALLBACK_LOCKTIME` is not provided, then it is assumed to be 0. If one or more inputs have a `PSBT_IN_REQUIRED_TIME_LOCKTIME` or `PSBT_IN_REQUIRED_HEIGHT_LOCKTIME`, then the field chosen is the one which is supported by all of the inputs. This can be determined by looking at all of the inputs which specify a locktime in either of those fields, and choosing the field which is present in all of those inputs. Inputs not specifying a lock time field can take both types of lock times, as can those that specify both. The lock time chosen is then the maximum value of the chosen type of lock time. If a PSBT has both types of locktimes possible because one or more inputs specify both `PSBT_IN_REQUIRED_TIME_LOCKTIME` and `PSBT_IN_REQUIRED_HEIGHT_LOCKTIME`, then locktime determined by looking at the `PSBT_IN_REQUIRED_HEIGHT_LOCKTIME` fields of the inputs must be chosen.

##### `public dangerouslySetGlobalTxVersion1`

A helper method for compatibility. Some devices require a psbtV2 configured with a transaction version of 1. BIP370 leaves room for this if the Creator is also the Constructor.

##### `public addGlobalXpub`

Adds an entry to the `PSBT_GLOBAL_XPUB` keytype given xpub, fingerprint, and derivation path.

##### `public addInput`

Adds an input to the PSBT. This method validates inputs modifiable on `PSBT_GLOBAL_TX_MODIFIABLE`, but other validation is incomplete. Adds details to the input map keytypes if present and increments the global input count. These keytypes include:

- `PSBT_GLOBAL_INPUT_COUNT`
- `PSBT_IN_BIP32_DERIVATION`
- `PSBT_IN_NON_WITNESS_UTXO`
- `PSBT_IN_OUTPUT_INDEX`
- `PSBT_IN_PREVIOUS_TXID`
- `PSBT_IN_REDEEM_SCRIPT`
- `PSBT_IN_SEQUENCE`
- `PSBT_IN_WITNESS_SCRIPT`
- `PSBT_IN_WITNESS_UTXO`

##### `public addOutput`

Adds an output to the PSBT. This method validates outputs modifiable on `PSBT_GLOBAL_TX_MODIFIABLE`, but other validation is incomplete. Adds details to the output map keytypes if present and increments the global output count. These keytypes include:

- `PSBT_GLOBAL_OUTPUT_COUNT`
- `PSBT_OUT_AMOUNT`
- `PSBT_OUT_BIP32_DERIVATION`
- `PSBT_OUT_REDEEM_SCRIPT`
- `PSBT_OUT_SCRIPT`
- `PSBT_OUT_WITNESS_SCRIPT`

##### `public deleteInput`

Removes an input from the PSBT. This method validates inputs modifiable on `PSBT_GLOBAL_TX_MODIFIABLE`, but other validation is incomplete. All keytype references to the input index in the input map are removed. `PSBT_GLOBAL_INPUT_COUNT` is decremented.

##### `public deleteOutput`

Removes an output from the PSBT. This method validates outputs modifiable on `PSBT_GLOBAL_TX_MODIFIABLE`, but other validation is incomplete. All keytype references to the output index in the output map are removed. `PSBT_GLOBAL_OUTPUT_COUNT` is decremented.

##### `public addPartialSig`

Adds a signature for an input. Validates that the input is mapped and does not already have a signature for the pubkey. Also validates for sighash. Other validation is incomplete.

The Signer, when it creates a signature, must add the partial sig keypair to the psbt for the input which it is signing. In the case that a particular signer does not, this method can be used to add a signature to the psbt. This method assumes the Signer did the validation outlined in BIP0174 before creating a signature. See [BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#signer).

##### `public removePartialSig`

Removes all sigs for an input unless a pubkey is specified. Validates that the input exists. When providing a pubkey, this validates that a sig for the pubkey exists.

##### `public setProprietaryValue`

Sets values on the proprietary keytype for a global, input, or output map. BIP 174 allows for proprietary values to be set on all maps with the keytype `0xFC`. This method sets byte data to key values defined by the args.

Args:

- `mapSelector` selects which map to set the proprietary value. If this value is not `"global"`, then a tuple must be provided with `"inputs"` or `"outputs"` as the first element and the index `number` on the second element representing which input or output map to set the value to. An example looks like `["inputs", 0]`. If the map name doesn't match, the values will be set to the global map. If the index is missing on `"inputs"` or `"outputs"`, then it will throw.
- `identifier` should be the bytes identifier for the set of proprietary keytypes.
- `subkeyType` accepts bytes proprietary keytype.
- `subkeyData` accepts bytes proprietary keydata.
- `valueData` accepts bytes which will be written as the proprietary value.

From the provided args, a key with the following format will be generated: `0xFC<compact uint identifier length><bytes identifier><bytes subtype><bytes subkeydata>`

##### `static PsbtV2.FromV0`

Attempts to return a `PsbtV2` by converting from a PSBTv0 string or Buffer

#### `function getPsbtVersionNumber`

Attempts to extract the version number as uint32LE from raw psbt regardless of psbt validity.

## Concepts

### The operator role saga

The PSBT is a resource which may be passed between several operators or services. It's best to look at the operator roles as stages of a saga. The next valid operator role(s) can be determined by the state of the PSBT. The actions allowed for a PSBT are determined by which operator role the PSBT can be now and which role it could be next. See the following blog article at Unchained for a more detailed illustration: [Operator roles: Life stages in the saga of a PSBT](https://unchained.com/blog/operator-roles-life-stages-in-the-saga-of-a-psbt/)

## TODO

### PsbtV2

#### Operator role validation

Work remains for determining readiness for operator roles Input Finalizer and Transaction Extractor. The getters responsible for these checks are `isReadyForInputFinalizer` and `isReadyForTransactionExtractor`. Work also remains to expand the PsbtV2 method functionality beyond the Signer role. A huge benefit might be gained from building methods aimed at the Combiner role.

#### Class constructor

The constructor must be able to handle values which the Creator role is responsible for. Currently, the constructor can only accept an optional psbt which it parses to configure itself. It would be ideal if a fresh PsbtV2 instance could be initialized with minimal arguments for which the Creator role is responsible. See `private create()`.

#### Add input timelocks

The `public addInput` must be able to properly handle input locktimes which interact with the global value.

#### Add input sighash_single

The `public addInput` must be able to properly handle new inputs when the psbt has a `SIGHASH_SINGLE` flag on `PSBT_GLOBAL_TX_MODIFIABLE`.

## Troubleshooting and FAQ
### What's with the vendor version of tiny-secp256k1?
In v6 of bitcoinjs-lib, which @caravan/psbt upgraded to use relative v5 in the older psbt code in @caravan/bitcoin,
some functions of the library require an elliptic curve library to be initialized w/ bitcoinjs-lib (see [this issue](https://github.com/bitcoinjs/bitcoinjs-lib/issues/1889#issuecomment-1443792692)), e.g. for taproot functionality.
For some reason, the recommended library `tiny-secp256k1` fails on initialization saying the library is invalid. The cause
seems to be a comparison of a Buffer with Uint8Array (see [this issue](https://github.com/bitcoinjs/tiny-secp256k1/issues/136) for more info).

A proposed fix is pending review and approval [here](https://github.com/bitcoinjs/tiny-secp256k1/pull/137). Unfortunately, since there
is a special build requirement to get the package code, the easiest way to get bitcoinjs initialized was to include patched vendor code in
the caravan codebase for now.

If a fork needs to be maintained and updated, to build and update the code, you can fork the repo, and run the docker build steps:

```
% docker build -t tiny-secp256k1 .
% docker run -it --rm -v `pwd`:/tiny-secp256k1 -w /tiny-secp256k1 tiny-secp256k1
# make build
```
Then copy the resulting built code (ends up in the lib directory) into the vendor/tiny-secp256k1. Currently
we just use the asmjs build to avoid wasm complications in
the build system.

### What's with the `bitcoinjs-lib-v6` dependency?

npm workspaces and maybe vite have issues with nested dependencies with
mismatched versions. `@caravan/psbt` requires v6 of bitcoinjs-lib but in order
to avoid making massive breaking changes, other libraries like `@caravan/bitcoin` are
still using bitcoinjs-lib v5. Unfortunately when being built altogether, it's possible
that the wrong version takes precedence, causing the build to break.

Because npm lacks a `nohoist` option for workspaces, the workaround is to use a kind
of alias in the package.json. So we add `"bitcoinjs-lib-v6": "npm:bitcoinjs-lib@^6.1.5",`
to say that we want to use v6.1.5 from npm whenever use the alias `bitcoinjs-lib-v6`
in imports in our code. This forces build systems to look for this reference and
the correct version of the package and avoid using a mismatch. Unfortunately
this was the only workaround that worked. `overrides` for example was not being
respected.

Learn more [here](https://github.com/vitejs/vite/issues/4245),
[here](https://github.com/zackerydev/noist?tab=readme-ov-file), and
[here](https://github.com/prisma/prisma/issues/9649).
