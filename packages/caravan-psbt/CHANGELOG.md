# @caravan/psbt

## 2.0.0

### Patch Changes

- Updated dependencies [[`8d22ab5`](https://github.com/caravan-bitcoin/caravan/commit/8d22ab5178b1b731858b2fd08683e7d3a1b0aa44)]:
  - @caravan/bitcoin@0.4.0

## 1.9.6

### Patch Changes

- Updated dependencies [[`73754e4`](https://github.com/caravan-bitcoin/caravan/commit/73754e431ca7286de7d1c78305b5ebd9070a15d9)]:
  - @caravan/bitcoin@0.3.4

## 1.9.5

### Patch Changes

- Updated dependencies [[`ee24a45`](https://github.com/caravan-bitcoin/caravan/commit/ee24a453d20b37fc0fed1455dcde41ec2ddd6e09)]:
  - @caravan/bitcoin@0.3.3

## 1.9.4

### Patch Changes

- [#259](https://github.com/caravan-bitcoin/caravan/pull/259) [`e713be4`](https://github.com/caravan-bitcoin/caravan/commit/e713be4583123a53e835dc2e60d673e27c376846) Thanks [@bucko13](https://github.com/bucko13)! - update build dependencies to newer versions and fix polyfills

- Updated dependencies [[`e713be4`](https://github.com/caravan-bitcoin/caravan/commit/e713be4583123a53e835dc2e60d673e27c376846)]:
  - @caravan/bitcoin@0.3.2
  - @caravan/bip32@1.0.1

## 1.9.3

### Patch Changes

- [#229](https://github.com/caravan-bitcoin/caravan/pull/229) [`7bf47bf`](https://github.com/caravan-bitcoin/caravan/commit/7bf47bfc8ea8b5ec78c4ff562e4fcc9e72ec508c) Thanks [@krrish-sehgal](https://github.com/krrish-sehgal)! - Replaced the setters with the private functions so that the output and input count always stays in sync with the actual counts in the PSBT.

## 1.9.2

### Patch Changes

- [#239](https://github.com/caravan-bitcoin/caravan/pull/239) [`84de228`](https://github.com/caravan-bitcoin/caravan/commit/84de2287ccbfe9033b5bde46c23cb1b50c41face) Thanks [@joelangeway](https://github.com/joelangeway)! - Adds a fix for importing @caravan/psbt on the server side.

## 1.9.1

### Patch Changes

- [#233](https://github.com/caravan-bitcoin/caravan/pull/233) [`ae1971e`](https://github.com/caravan-bitcoin/caravan/commit/ae1971ed3f0f83095c92b5f86f0d58fa1fafa882) Thanks [@bucko13](https://github.com/bucko13)! - use peer deps to enforce minimum caravan-bitcoin dependency

## 1.9.0

### Minor Changes

- [#199](https://github.com/caravan-bitcoin/caravan/pull/199) [`b3d3033`](https://github.com/caravan-bitcoin/caravan/commit/b3d3033f807bf41c270af890ba8459ff31263ac0) Thanks [@Shadouts](https://github.com/Shadouts)! - Fixes PsbtV2.isReadyForConstructor by not requiring that PSBT_GLOBAL_FALLBACK_LOCKTIME be set. This field is not required on a psbtv2 per BIP370.

## 1.8.0

### Minor Changes

- [#188](https://github.com/caravan-bitcoin/caravan/pull/188) [`941235e`](https://github.com/caravan-bitcoin/caravan/commit/941235e4c9cfff5e33dbb676a079a71d6a6eaee6) Thanks [@Shadouts](https://github.com/Shadouts)! - allowTxnVersion1 option added to PsbtV2 constructor.

## 1.7.1

### Patch Changes

- [#174](https://github.com/caravan-bitcoin/caravan/pull/174) [`3689269`](https://github.com/caravan-bitcoin/caravan/commit/3689269ae1d35678cb4257f1f68b5fc6bd161375) Thanks [@bucko13](https://github.com/bucko13)! - fix dependencies for caravan-psbt on caravan-bitcoin

## 1.7.0

### Minor Changes

- [#158](https://github.com/caravan-bitcoin/caravan/pull/158) [`2a2e674`](https://github.com/caravan-bitcoin/caravan/commit/2a2e6748694301cf83806b173cd2dbea365a3089) Thanks [@Shadouts](https://github.com/Shadouts)! - PsbtV2.toV0 method added

## 1.6.0

### Minor Changes

- [#147](https://github.com/caravan-bitcoin/caravan/pull/147) [`0a73b09`](https://github.com/caravan-bitcoin/caravan/commit/0a73b094984fd59c7564eda0fa31eb8f05b96927) Thanks [@bucko13](https://github.com/bucko13)! - Adds support for translatePSBT for segwit PSBTs. This enables loading tx data directly from a psbt for ledger and trezor

## 1.5.0

### Minor Changes

- [#114](https://github.com/caravan-bitcoin/caravan/pull/114) [`8d79fc6`](https://github.com/caravan-bitcoin/caravan/commit/8d79fc6cfbd63bee37f076c4396a94d30e412e6f) Thanks [@Legend101Zz](https://github.com/Legend101Zz)! - Added methods to handle sequence numbers within PSBTs for better RBF (Replace-By-Fee) support:

## 1.4.3

### Patch Changes

- [#124](https://github.com/caravan-bitcoin/caravan/pull/124) [`ed8a2dd`](https://github.com/caravan-bitcoin/caravan/commit/ed8a2dd5cc53cee30fef430d2b02ae616e76376d) Thanks [@chadchapnick](https://github.com/chadchapnick)! - SegWit PSBT fixes: include non witness utxo for inputs and witness script for outputs

- Updated dependencies [[`ed8a2dd`](https://github.com/caravan-bitcoin/caravan/commit/ed8a2dd5cc53cee30fef430d2b02ae616e76376d)]:
  - @caravan/bitcoin@0.3.1

## 1.4.2

### Patch Changes

- [#120](https://github.com/caravan-bitcoin/caravan/pull/120) [`d8078d8`](https://github.com/caravan-bitcoin/caravan/commit/d8078d80cdbf7d2ebd131e6f9253572a6a133d34) Thanks [@chadchapnick](https://github.com/chadchapnick)! - Restore multisig support for indirect keystore interactions

## 1.4.1

### Patch Changes

- [#108](https://github.com/caravan-bitcoin/caravan/pull/108) [`2a8f502`](https://github.com/caravan-bitcoin/caravan/commit/2a8f5022119dea9ce04903a2f1866de66fc39940) Thanks [@bucko13](https://github.com/bucko13)! - fixes an import issue when used in as an external dep

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
