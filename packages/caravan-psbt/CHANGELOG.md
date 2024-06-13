# @caravan/psbt

## 1.4.0

### Minor Changes

- [#104](https://github.com/caravan-bitcoin/caravan/pull/104) [`400cb08`](https://github.com/caravan-bitcoin/caravan/commit/400cb084f58d1549a7eee2ce35f3f8683f79f975) Thanks [@bucko13](https://github.com/bucko13)! - \* caravan/psbt has new functions ported from caravan/bitcoin for legacy interactions with upgraded libs
  - caravan/wallets uses the upgraded versions of translatedPsbt to support taproot outputs
  - caravan coordinator now supports S2TR, better regtest support and other QoL improvements

## 1.3.2

### Patch Changes

- [#102](https://github.com/caravan-bitcoin/caravan/pull/102) [`7e34665`](https://github.com/caravan-bitcoin/caravan/commit/7e34665ec9c220407cb1713eaaea5c41bed26b1f) Thanks [@bucko13](https://github.com/bucko13)! - move internal deps to devDependencies

## 1.3.1

### Patch Changes

- [#98](https://github.com/caravan-bitcoin/caravan/pull/98) [`24cfb7b`](https://github.com/caravan-bitcoin/caravan/commit/24cfb7bd41c6f767c195f40044d0377edcd6dff4) Thanks [@bucko13](https://github.com/bucko13)! - update caravan/multisig dependency to remove a "real" version

## 1.3.0

### Minor Changes

- [#91](https://github.com/caravan-bitcoin/caravan/pull/91) [`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3) Thanks [@bucko13](https://github.com/bucko13)! - export of new utils for psbt v0 handling. Primarily adds support for taproot outputs by upgrading to bitcoinjs-lib v6 depedency. Upgrades to a new API from legacy utils from caravan/bitcoin and includes some utilities and types for handling conversions.

### Patch Changes

- Updated dependencies [[`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3), [`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3), [`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3)]:
  - @caravan/bitcoin@0.2.0
  - @caravan/multisig@2.0.0

## 1.2.0

### Minor Changes

- [#73](https://github.com/caravan-bitcoin/caravan/pull/73) [`c58f786`](https://github.com/caravan-bitcoin/caravan/commit/c58f786c3409795e12a17a4fe9a3ff4fbf7c6517) Thanks [@Shadouts](https://github.com/Shadouts)! - PsbtV2 public setProprietaryValue allows for proprietary value mapping on the psbt.

## 1.1.0

### Minor Changes

- [#65](https://github.com/caravan-bitcoin/caravan/pull/65) [`514b72f`](https://github.com/caravan-bitcoin/caravan/commit/514b72fe071ee39db833d4d6b6c4a95df288008e) Thanks [@Shadouts](https://github.com/Shadouts)! - PsbtV2 operator role validation getters are added to provide a way for validating role readiness. These getters are used in some Constructor and Signer methods. For example, an error will be thrown if `addPartialSig` is called when the PsbtV2 is not ready for a Signer.

## 1.0.1

### Patch Changes

- [#57](https://github.com/caravan-bitcoin/caravan/pull/57) [`0c6e919`](https://github.com/caravan-bitcoin/caravan/commit/0c6e91936724fa76651d0baf16f5a4e52d375718) Thanks [@Shadouts](https://github.com/Shadouts)! - psbtv2 module directory added and many types have been split into their own module files.

## 0.0.0

### Patch Changes

- [#15](https://github.com/caravan-bitcoin/caravan/pull/15) [`a39dfde`](https://github.com/caravan-bitcoin/caravan/commit/a39dfde2aab9908370bc5eea032960b1939f1e14) Thanks [@bucko13](https://github.com/bucko13)! - maintenance patch to cleanup dependencies

- Updated dependencies [[`a39dfde`](https://github.com/caravan-bitcoin/caravan/commit/a39dfde2aab9908370bc5eea032960b1939f1e14)]:
  - @caravan/bitcoin@0.0.1
