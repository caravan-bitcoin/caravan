# @caravan/psbt

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
