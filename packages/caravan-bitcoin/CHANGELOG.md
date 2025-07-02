# Changelog

## 0.4.0

### Minor Changes

- [#318](https://github.com/caravan-bitcoin/caravan/pull/318) [`8d22ab5`](https://github.com/caravan-bitcoin/caravan/commit/8d22ab5178b1b731858b2fd08683e7d3a1b0aa44) Thanks [@bucko13](https://github.com/bucko13)! - fixes miscalculations and edge cases around tx and input size calcuations. also exposes a new utility for providing weight of a input for a given script type.

## 0.3.4

### Patch Changes

- [#300](https://github.com/caravan-bitcoin/caravan/pull/300) [`73754e4`](https://github.com/caravan-bitcoin/caravan/commit/73754e431ca7286de7d1c78305b5ebd9070a15d9) Thanks [@chadchapnick](https://github.com/chadchapnick)! - bump bignumber.js to 9.3.0

## 0.3.3

### Patch Changes

- [#296](https://github.com/caravan-bitcoin/caravan/pull/296) [`ee24a45`](https://github.com/caravan-bitcoin/caravan/commit/ee24a453d20b37fc0fed1455dcde41ec2ddd6e09) Thanks [@chadchapnick](https://github.com/chadchapnick)! - adjust P2SH output vbyte estimation to account for fixed length script hash

## 0.3.2

### Patch Changes

- [#259](https://github.com/caravan-bitcoin/caravan/pull/259) [`e713be4`](https://github.com/caravan-bitcoin/caravan/commit/e713be4583123a53e835dc2e60d673e27c376846) Thanks [@bucko13](https://github.com/bucko13)! - update build dependencies to newer versions and fix polyfills

## 0.3.1

### Patch Changes

- [#124](https://github.com/caravan-bitcoin/caravan/pull/124) [`ed8a2dd`](https://github.com/caravan-bitcoin/caravan/commit/ed8a2dd5cc53cee30fef430d2b02ae616e76376d) Thanks [@chadchapnick](https://github.com/chadchapnick)! - SegWit PSBT fixes: include non witness utxo for inputs and witness script for outputs

## 0.3.0

### Minor Changes

- [#112](https://github.com/caravan-bitcoin/caravan/pull/112) [`7cf2bf4`](https://github.com/caravan-bitcoin/caravan/commit/7cf2bf48ebda2d8dc45c6a83068a5dc5ce028beb) Thanks [@Harshil-Jani](https://github.com/Harshil-Jani)! - @caravan/client
  We are exposing a new method `getAddressTransactions` which will fetch all the transaction for a given address and format it as per needs. To facilitate the change, we had moved the interfaces in the new file `types.ts`.

  Another change was about getting the block fee-rate percentile history from mempool as a client.

  @caravan/bitcoin
  The new function that has the capability to detect the address type (i.e P2SH, P2PKH, P2WSH or P2TR) was added.

  Overall, The changes were to support the new library within caravan called @caravan/health.

## 0.2.0

### Minor Changes

- [#91](https://github.com/caravan-bitcoin/caravan/pull/91) [`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3) Thanks [@bucko13](https://github.com/bucko13)! - export signature utilities from caravan/bitcoin to support new psbt tooling

- [#91](https://github.com/caravan-bitcoin/caravan/pull/91) [`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3) Thanks [@bucko13](https://github.com/bucko13)! - transaction parser was stripping out network information from global xpubs being added to psbt. global xpubs will now respect the network and include appropriate prefix

## 0.1.0

### Minor Changes

- [#79](https://github.com/caravan-bitcoin/caravan/pull/79) [`f4ec934`](https://github.com/caravan-bitcoin/caravan/commit/f4ec9348598ee07e974208d6b18b8dfecad511eb) Thanks [@benthecarman](https://github.com/benthecarman)! - Fixed bug with detecting odd length string

## 0.0.3

### Patch Changes

- [#21](https://github.com/caravan-bitcoin/caravan/pull/21) [`c8ac4d3`](https://github.com/caravan-bitcoin/caravan/commit/c8ac4d37f8e6e1c7e71010c7e7723468d63d8c75) Thanks [@bucko13](https://github.com/bucko13)! - lint fixes

## 0.0.2

### Patch Changes

- [#18](https://github.com/caravan-bitcoin/caravan/pull/18) [`df50672`](https://github.com/caravan-bitcoin/caravan/commit/df506724b82c65ac47012e8da8a962e34611790e) Thanks [@bucko13](https://github.com/bucko13)! - - Makes package.jsons more explicit for wallets and bitcoin.
  - caravan/bitcoin now exports its types explicitly

## 0.0.1

### Patch Changes

- [#15](https://github.com/caravan-bitcoin/caravan/pull/15) [`a39dfde`](https://github.com/caravan-bitcoin/caravan/commit/a39dfde2aab9908370bc5eea032960b1939f1e14) Thanks [@bucko13](https://github.com/bucko13)! - maintenance patch to cleanup dependencies

## 0.0.0

### Major Changes

- [#1](https://github.com/caravan-bitcoin/caravan/pull/1) [`bba4758`](https://github.com/caravan-bitcoin/caravan/commit/bba47584018891aad88f2665521f2f8e4025beb2) Thanks [@bucko13](https://github.com/bucko13)! - initial publication of new monorepo-based packages and app

## [1.2.1](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v1.2.0...unchained-bitcoin-v1.2.1) (2024-01-04)

### Bug Fixes

- **fixtures:** fix hmac fixtures ([071467a](https://github.com/unchained-capital/unchained-bitcoin/commit/071467a5be288319fb92f65c3e990deb80e8e9ca))

## [1.2.0](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v1.1.0...unchained-bitcoin-v1.2.0) (2024-01-04)

### Features

- fee error types ([1e1fe02](https://github.com/unchained-capital/unchained-bitcoin/commit/1e1fe02dc901f9db0b35ae1a95807b7e6289dc5e))

## [1.1.0](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v1.0.2...unchained-bitcoin-v1.1.0) (2023-12-15)

### Features

- fix validateOutputAmount API for BigNumber ([9081171](https://github.com/unchained-capital/unchained-bitcoin/commit/90811716fa512c2bed9ce1235fbcb273550a57fa))

### Bug Fixes

- preserve backward compatibility ([9081171](https://github.com/unchained-capital/unchained-bitcoin/commit/90811716fa512c2bed9ce1235fbcb273550a57fa))

## [1.0.2](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v1.0.1...unchained-bitcoin-v1.0.2) (2023-11-16)

### Bug Fixes

- update bitcoin-address-validation + include taproot address validate in tests ([facc253](https://github.com/unchained-capital/unchained-bitcoin/commit/facc253373029739590649e7dd1185fc2831955f))

## [1.0.1](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v1.0.0...unchained-bitcoin-v1.0.1) (2023-11-06)

### Bug Fixes

- auto publish to npm ([ada4f05](https://github.com/unchained-capital/unchained-bitcoin/commit/ada4f0570a9d73213c8a18a78c9892f42d8ad255))

## [1.0.0](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v0.6.0...unchained-bitcoin-v1.0.0) (2023-09-29)

### ⚠ BREAKING CHANGES

- typescript and v1 ([#95](https://github.com/unchained-capital/unchained-bitcoin/issues/95))

### Features

- typescript and v1 ([#95](https://github.com/unchained-capital/unchained-bitcoin/issues/95)) ([c5abea1](https://github.com/unchained-capital/unchained-bitcoin/commit/c5abea1ca410324c2d4adf43d1a7d9812f086207))

## [0.6.0](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v0.5.1...unchained-bitcoin-v0.6.0) (2023-08-31)

### Features

- ensure BigNumber classes are not returned ([#89](https://github.com/unchained-capital/unchained-bitcoin/issues/89)) ([e60da88](https://github.com/unchained-capital/unchained-bitcoin/commit/e60da88b39ceae378ee20df2798c8ad9ed71d976))

### Bug Fixes

- restore exporting of type modules for commonjs compatibility ([#94](https://github.com/unchained-capital/unchained-bitcoin/issues/94)) ([9ffccdb](https://github.com/unchained-capital/unchained-bitcoin/commit/9ffccdb76a85d845749d94beaf042f0991ef208b))

## [0.5.1](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v0.5.0...unchained-bitcoin-v0.5.1) (2023-05-30)

### Bug Fixes

- **braid:** allow for regtest braids ([06b05fb](https://github.com/unchained-capital/unchained-bitcoin/commit/06b05fb8b70feed7f6ecc1b9bf333746f9f9cf9d))

## [0.5.0](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v0.4.1...unchained-bitcoin-v0.5.0) (2023-04-06)

### Features

- add minSats to the validateOutputAmount function. Fix missing package ([52b3c60](https://github.com/unchained-capital/unchained-bitcoin/commit/52b3c6091b9656fbd1ae86587a054b1551d6c621))

### Bug Fixes

- add test ([31ab2de](https://github.com/unchained-capital/unchained-bitcoin/commit/31ab2de309360fa5824b1cddeba8e2910838767b))

## [0.4.1](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v0.4.0...unchained-bitcoin-v0.4.1) (2023-03-31)

### Bug Fixes

- **keys:** include regtest for tpub validation ([a298eb8](https://github.com/unchained-capital/unchained-bitcoin/commit/a298eb8a618dddd2823b30f5c6e933db1dff1b5e))

## Changelog

## Version 0.0.12

### Added

- ExtendedPublicKey class for encoding and decoding xpubs

### Changed

- Basic linting fixes

## Version 0.0.11

### Added

- Support for conversion between different xpub prefixes/versions
- Test fixtures for different extended public key versions

## Version 0.0.9

### Changed

Include Bech32 outputs for P2WSH fixtures & tests.

## Version 0.0.8

### Added

- Utilities for working with extended public keys, useful for
  extracting xpubs from Ledger devices.

### Changed

- `docs` tree is now in its own `gh-pages` branch

## Version 0.0.7

### Changed

Major refactoring of documentation and API.

## Version 0.0.6

### Added

- `CHANGELOG.md` file

### Changed

- Input & output amounts are forced to BigNumber

### Removed

- Unused arguments in some block explorer functions
