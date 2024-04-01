# Caravan PSBT

A set of utilities for working with PSBTs.

## Table of contents

- [PSBTv0](#psbtv0)
  - [Exports](#psbtv0-exports)
    - [`const PSBT_MAGIC_HEX`](#const-psbt_magic_hex)
    - [`const PSBT_MAGIC_B64`](#const-psbt_magic_b64)
    - [`const PSBT_MAGIC_BYTES`](#const-psbt_magic_bytes)
    - [`function autoLoadPSBT`](#function-autoloadpsbt)
    - [`function psbtInputFormatter`](#function-psbtinputformatter)
    - [`function psbtOutputFormatter`](#function-psbtoutputformatter)
    - [`function translatePSBT`](#function-translatepsbt)
    - [`function addSignaturesToPSBT`](#function-addsignaturestopsbt)
    - [`function parseSignaturesFromPSBT`](#function-parsesignaturesfrompsbt)
    - [`function parseSignatureArrayFromPSBT`](#function-parsesignaturearrayfrompsbt)
- [PSBTv2](#psbtv2)
  - [Exports](#psbtv2-exports)
    - [`class PsbtV2`](#class-psbtv2)
      - [`get nLockTime`](#get-nlocktime)
      - [`public dangerouslySetGlobalTxVersion1`](#public-dangerouslysetglobaltxversion1)
      - [`public addGlobalXpub`](#public-addglobalxpub)
      - [`public addInput`](#public-addinput)
      - [`public addOutput`](#public-addoutput)
      - [`public deleteInput`](#public-deleteinput)
      - [`public deleteOutput`](#public-deleteoutput)
      - [`public addPartialSig`](#public-addpartialsig)
      - [`public removePartialSig`](#public-removepartialsig)
      - [`static PsbtV2.FromV0`](#static-psbtv2fromv0)
    - [`function getPsbtVersionNumber`](#function-getpsbtversionnumber)
    - [`abstract class PsbtV2Maps`](#abstract-class-psbtv2maps)
      - [`public copy`](#public-copy)
- [Concepts](#concepts)
  - [The operator role saga](#the-operator-role-saga)
- [TODO](#todo)

## PSBTv0

[BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)

### Exports

#### `const PSBT_MAGIC_HEX`

A utility constant for hex encoded psbt magic bytes equal to `"70736274ff"`.

#### `const PSBT_MAGIC_B64`

A utility constant for base64 encoded psbt magic bytes equal to `"cHNidP8"`.

#### `const PSBT_MAGIC_BYTES`

A utility constant for `Buffer` instance of psbt magic bytes.

#### `function autoLoadPSBT`

Given a string, try to create a Psbt object based on MAGIC (hex or Base64).

#### `function psbtInputFormatter`

Take a `MultisigTransactionInput` and turn it into a `MultisigTransactionPSBTInput`.

#### `function psbtOutputFormatter`

Take a `MultisigTransactionOutput` and turn it into a `MultisigTransactionPSBTOutput`.

#### `function translatePSBT`

Translates a PSBT into inputs/outputs consumable by supported non-PSBT devices in the `@caravan/wallets` library.

#### `function addSignaturesToPSBT`

Given an unsigned PSBT, an array of signing public key(s) (one per input), an array of signature(s) (one per input) in the same order as the pubkey(s), adds partial signature object(s) to each input and returns the PSBT with partial signature(s) included.

#### `function parseSignaturesFromPSBT`

Extracts the signature(s) from a PSBT.

NOTE: there should be one signature per input, per signer.

ADDITIONAL NOTE: because of the restrictions we place on braids to march their multisig addresses (slices) forward at the _same_ index across each chain of the braid, we do not run into a possible collision with this data structure. BUT - to have this method accommodate the _most_ general form of signature parsing, it would be wise to wrap this one level deeper like:

```
address: [pubkey : [signature(s)]]
```

that way if your braid only advanced one chain's (member's) index so that a pubkey could be used in more than one address, everything would still function properly.

#### `function parseSignatureArrayFromPSBT`

Extracts signatures in order of inputs and returns as array (or array of arrays if multiple signature sets).

## PSBTv2

The `psbtv2` module provides utilities for working with v2 PSBTs and transformations or conversions between v0 and v2.

### Exports

#### `class PsbtV2`

An object class representing a PSBTv2 and its current state. While not yet complete, this class aims to also provide sufficient checking to ensure only valid PSBTs are represented and that only valid actions may be taken per operator role.

Getters and setters are provided for the keytypes defined in [BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki) and [BIP 370](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki). These getters/setters are named after the keytype in ALL_CAPS_SNAKE like `PsbtV2.PSBT_GLOBAL_VERSION`. Additional getters/setters may be listed in the following API documentation.

##### `get nLockTime`

Returns the `nLockTime` field for the psbt as if it were a bitcoin transaction.

From BIP 370:

> The nLockTime field of a transaction is determined by inspecting the `PSBT_GLOBAL_FALLBACK_LOCKTIME` and each input's `PSBT_IN_REQUIRED_TIME_LOCKTIME` and `PSBT_IN_REQUIRED_HEIGHT_LOCKTIME` fields. If none of the inputs have a `PSBT_IN_REQUIRED_TIME_LOCKTIME` and \*(or) `PSBT_IN_REQUIRED_HEIGHT_LOCKTIME`, then `PSBT_GLOBAL_FALLBACK_LOCKTIME` must be used. If `PSBT_GLOBAL_FALLBACK_LOCKTIME` is not provided, then it is assumed to be 0. If one or more inputs have a `PSBT_IN_REQUIRED_TIME_LOCKTIME` or `PSBT_IN_REQUIRED_HEIGHT_LOCKTIME`, then the field chosen is the one which is supported by all of the inputs. This can be determined by looking at all of the inputs which specify a locktime in either of those fields, and choosing the field which is present in all of those inputs. Inputs not specifying a lock time field can take both types of lock times, as can those that specify both. The lock time chosen is then the maximum value of the chosen type of lock time. If a PSBT has both types of locktimes possible because one or more inputs specify both `PSBT_IN_REQUIRED_TIME_LOCKTIME` and `PSBT_IN_REQUIRED_HEIGHT_LOCKTIME`, then locktime determined by looking at the `PSBT_IN_REQUIRED_HEIGHT_LOCKTIME` fields of the inputs must be chosen.

##### `public dangerouslySetGlobalTxVersion1`

A helper method for compatibility, but seems to no-longer be required.

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

##### `static PsbtV2.FromV0`

Attempts to return a `PsbtV2` by converting from a PSBTv0 string or Buffer

#### `function getPsbtVersionNumber`

Attempts to extract the version number as uint32LE from raw psbt regardless of psbt validity.

#### `abstract class PsbtV2Maps`

This is provided for utility for compatibility and to allow for mapping, map copying, and serialization operations for psbts. This does almost no validation, so do not rely on it for ensuring a valid psbt.

##### `public copy`

Copies the maps in this PsbtV2 object to another PsbtV2 object.

NOTE: This copy method is made available to achieve parity with the PSBT api required by `ledger-bitcoin` for creating merklized PSBTs. HOWEVER, it is not recommended to use this when avoidable as copying maps bypasses the validation defined in the constructor, so it could create a psbtv2 in an invalid psbt state. PsbtV2.serialize is preferable whenever possible.

## Concepts

### The operator role saga

The PSBT is a resource which may be passed between several operators or services. It's best to look at the operator roles as stages of a saga. The next valid operator role(s) can be determined by the state of the PSBT. The actions allowed for a PSBT are determined by which operator role the PSBT can be now and which role it could be next. See the following blog article at Unchained for a more detailed illustration: [Operator roles: Life stages in the saga of a PSBT](https://unchained.com/blog/operator-roles-life-stages-in-the-saga-of-a-psbt/)

### TODO

Work remains on PSBTv2 for determining the next valid operator role(s) and restricting actions based on PSBT state. In other words, if the state of the PSBT suggests the PSBT might be in role A and is ready for role B, it should only allow actions within the context of role A or B.

The following list is a non-comprehensive list of validation checks which must be performed:

- Check ready for Updater role on `addInput`, `addOutput`, `deleteInput`, and `deleteOuput`.
- Check ready for Signer role on `addPartialSig`.
