# Changelog

## [1.2.1](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v1.2.0...unchained-bitcoin-v1.2.1) (2024-01-04)


### Bug Fixes

* **fixtures:** fix hmac fixtures ([071467a](https://github.com/unchained-capital/unchained-bitcoin/commit/071467a5be288319fb92f65c3e990deb80e8e9ca))

## [1.2.0](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v1.1.0...unchained-bitcoin-v1.2.0) (2024-01-04)


### Features

* fee error types ([1e1fe02](https://github.com/unchained-capital/unchained-bitcoin/commit/1e1fe02dc901f9db0b35ae1a95807b7e6289dc5e))

## [1.1.0](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v1.0.2...unchained-bitcoin-v1.1.0) (2023-12-15)


### Features

* fix validateOutputAmount API for BigNumber ([9081171](https://github.com/unchained-capital/unchained-bitcoin/commit/90811716fa512c2bed9ce1235fbcb273550a57fa))


### Bug Fixes

* preserve backward compatibility ([9081171](https://github.com/unchained-capital/unchained-bitcoin/commit/90811716fa512c2bed9ce1235fbcb273550a57fa))

## [1.0.2](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v1.0.1...unchained-bitcoin-v1.0.2) (2023-11-16)


### Bug Fixes

* update bitcoin-address-validation + include taproot address validate in tests ([facc253](https://github.com/unchained-capital/unchained-bitcoin/commit/facc253373029739590649e7dd1185fc2831955f))

## [1.0.1](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v1.0.0...unchained-bitcoin-v1.0.1) (2023-11-06)


### Bug Fixes

* auto publish to npm ([ada4f05](https://github.com/unchained-capital/unchained-bitcoin/commit/ada4f0570a9d73213c8a18a78c9892f42d8ad255))

## [1.0.0](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v0.6.0...unchained-bitcoin-v1.0.0) (2023-09-29)


### ⚠ BREAKING CHANGES

* typescript and v1 ([#95](https://github.com/unchained-capital/unchained-bitcoin/issues/95))

### Features

* typescript and v1 ([#95](https://github.com/unchained-capital/unchained-bitcoin/issues/95)) ([c5abea1](https://github.com/unchained-capital/unchained-bitcoin/commit/c5abea1ca410324c2d4adf43d1a7d9812f086207))

## [0.6.0](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v0.5.1...unchained-bitcoin-v0.6.0) (2023-08-31)


### Features

* ensure BigNumber classes are not returned ([#89](https://github.com/unchained-capital/unchained-bitcoin/issues/89)) ([e60da88](https://github.com/unchained-capital/unchained-bitcoin/commit/e60da88b39ceae378ee20df2798c8ad9ed71d976))


### Bug Fixes

* restore exporting of type modules for commonjs compatibility ([#94](https://github.com/unchained-capital/unchained-bitcoin/issues/94)) ([9ffccdb](https://github.com/unchained-capital/unchained-bitcoin/commit/9ffccdb76a85d845749d94beaf042f0991ef208b))

## [0.5.1](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v0.5.0...unchained-bitcoin-v0.5.1) (2023-05-30)


### Bug Fixes

* **braid:** allow for regtest braids ([06b05fb](https://github.com/unchained-capital/unchained-bitcoin/commit/06b05fb8b70feed7f6ecc1b9bf333746f9f9cf9d))

## [0.5.0](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v0.4.1...unchained-bitcoin-v0.5.0) (2023-04-06)


### Features

* add minSats to the validateOutputAmount function. Fix missing package ([52b3c60](https://github.com/unchained-capital/unchained-bitcoin/commit/52b3c6091b9656fbd1ae86587a054b1551d6c621))


### Bug Fixes

* add test ([31ab2de](https://github.com/unchained-capital/unchained-bitcoin/commit/31ab2de309360fa5824b1cddeba8e2910838767b))

## [0.4.1](https://github.com/unchained-capital/unchained-bitcoin/compare/unchained-bitcoin-v0.4.0...unchained-bitcoin-v0.4.1) (2023-03-31)


### Bug Fixes

* **keys:** include regtest for tpub validation ([a298eb8](https://github.com/unchained-capital/unchained-bitcoin/commit/a298eb8a618dddd2823b30f5c6e933db1dff1b5e))

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
