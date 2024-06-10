# Changelog

## 0.2.1

### Patch Changes

- [#98](https://github.com/caravan-bitcoin/caravan/pull/98) [`24cfb7b`](https://github.com/caravan-bitcoin/caravan/commit/24cfb7bd41c6f767c195f40044d0377edcd6dff4) Thanks [@bucko13](https://github.com/bucko13)! - update caravan/multisig dependency to remove a "real" version

- Updated dependencies [[`24cfb7b`](https://github.com/caravan-bitcoin/caravan/commit/24cfb7bd41c6f767c195f40044d0377edcd6dff4)]:
  - @caravan/psbt@1.3.1

## 0.2.0

### Minor Changes

- [#91](https://github.com/caravan-bitcoin/caravan/pull/91) [`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3) Thanks [@bucko13](https://github.com/bucko13)! - upgrading psbt generation to support taproot outputs and new caravan/psbt utils

### Patch Changes

- [#91](https://github.com/caravan-bitcoin/caravan/pull/91) [`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3) Thanks [@bucko13](https://github.com/bucko13)! - fixes an issue where esbuild was polyfilling process.env which breaks the ability to override trezor connect settings and pass other env vars at run time in dependent applications

- Updated dependencies [[`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3), [`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3), [`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3), [`0d81717`](https://github.com/caravan-bitcoin/caravan/commit/0d81717fade918ec337093e3dc4c3862662d20c3)]:
  - @caravan/psbt@1.3.0
  - @caravan/bitcoin@0.2.0
  - @caravan/multisig@2.0.0

## 0.1.2

### Patch Changes

- [#41](https://github.com/caravan-bitcoin/caravan/pull/41) [`7e055cd`](https://github.com/caravan-bitcoin/caravan/commit/7e055cd93acaaeeb74fd7fb7d31bc7e26f7c9820) Thanks [@bucko13](https://github.com/bucko13)! - Fix TrezorConnect default import for some build systems

## 0.1.1

### Patch Changes

- [#30](https://github.com/caravan-bitcoin/caravan/pull/30) [`baf9a7d`](https://github.com/caravan-bitcoin/caravan/commit/baf9a7d262d22752bb7fa723e1b681b1e86fe89c) Thanks [@bucko13](https://github.com/bucko13)! - Future-proof legacy version checking for Ledger bitcoin app

## 0.1.0

### Minor Changes

- [#18](https://github.com/caravan-bitcoin/caravan/pull/18) [`df50672`](https://github.com/caravan-bitcoin/caravan/commit/df506724b82c65ac47012e8da8a962e34611790e) Thanks [@bucko13](https://github.com/bucko13)! - - Makes package.jsons more explicit for wallets and bitcoin.
  - caravan/bitcoin now exports its types explicitly

### Patch Changes

- Updated dependencies [[`df50672`](https://github.com/caravan-bitcoin/caravan/commit/df506724b82c65ac47012e8da8a962e34611790e)]:
  - @caravan/bitcoin@0.0.2

## 0.0.1

### Patch Changes

- [#15](https://github.com/caravan-bitcoin/caravan/pull/15) [`a39dfde`](https://github.com/caravan-bitcoin/caravan/commit/a39dfde2aab9908370bc5eea032960b1939f1e14) Thanks [@bucko13](https://github.com/bucko13)! - maintenance patch to cleanup dependencies

- Updated dependencies [[`a39dfde`](https://github.com/caravan-bitcoin/caravan/commit/a39dfde2aab9908370bc5eea032960b1939f1e14)]:
  - @caravan/bitcoin@0.0.1

## 0.0.0

### Major Changes

- [#1](https://github.com/caravan-bitcoin/caravan/pull/1) [`bba4758`](https://github.com/caravan-bitcoin/caravan/commit/bba47584018891aad88f2665521f2f8e4025beb2) Thanks [@bucko13](https://github.com/bucko13)! - initial publication of new monorepo-based packages and app

### Patch Changes

- [#3](https://github.com/caravan-bitcoin/caravan/pull/3) [`d21ef4a`](https://github.com/caravan-bitcoin/caravan/commit/d21ef4a80486eb8f58f58f8032c15e91239c6515) Thanks [@bucko13](https://github.com/bucko13)! - resolves some linting errors with fix to lint rules and command

## [1.0.4](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v1.0.3...unchained-wallets-v1.0.4) (2024-01-29)

### Bug Fixes

- **trezor:** pin connect url to stable version ([5b256bf](https://github.com/unchained-capital/unchained-wallets/commit/5b256bf6ffcd259a74251442f06038e7ce2570bf))

## [1.0.3](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v1.0.2...unchained-wallets-v1.0.3) (2023-11-17)

### Bug Fixes

- lock ledger dependencies to avoid js errors ([f115e68](https://github.com/unchained-capital/unchained-wallets/commit/f115e686d90669bceb13c056eac29f12109e6764))

## [1.0.2](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v1.0.1...unchained-wallets-v1.0.2) (2023-11-06)

### Bug Fixes

- actions yaml bugs ([c7e05cf](https://github.com/unchained-capital/unchained-wallets/commit/c7e05cf417e6fce958fc94bf1b910a646ad6e42a))

## [1.0.1](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v1.0.0...unchained-wallets-v1.0.1) (2023-11-06)

### Bug Fixes

- random commit to bump publish task ([ab74787](https://github.com/unchained-capital/unchained-wallets/commit/ab7478711b7e499f04aef455bb7e62456df56beb))

## [1.0.0](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.6.2...unchained-wallets-v1.0.0) (2023-11-06)

### ⚠ BREAKING CHANGES

- jsdoc removal, typescript, and v1.0.0

### Features

- bumps complexity value to allow committing of typescript refactor ([6faa816](https://github.com/unchained-capital/unchained-wallets/commit/6faa816a719f97132f4fa679c49894cf007eea15))
- jsdoc removal, typescript, and v1.0.0 ([59eeb94](https://github.com/unchained-capital/unchained-wallets/commit/59eeb94511ce1e3dd7fc1fe2e73a098e3781b282))
- refactors bcur and coldcard to typescript ([2816238](https://github.com/unchained-capital/unchained-wallets/commit/281623823293a47f10d244766c6a44f7eaf855a4))
- refactors custom.js and tests to ts ([6b9be3b](https://github.com/unchained-capital/unchained-wallets/commit/6b9be3b315ddf06e4f9fca59cc8fd0baea6912ce))
- refactors hermit.js and tests to ts ([a9cc4c4](https://github.com/unchained-capital/unchained-wallets/commit/a9cc4c426de41143536fc17550b39ad75404073e))
- refactors trezor.js and tests to ts ([e5a431b](https://github.com/unchained-capital/unchained-wallets/commit/e5a431b92c1700d79b987c82d2251f66614b7334))
- removes redundant docstrings ([67c19f2](https://github.com/unchained-capital/unchained-wallets/commit/67c19f217c10444e8f300b2e8ac47c744cb213bb))

### Bug Fixes

- vite env vars for trezor ([85762ee](https://github.com/unchained-capital/unchained-wallets/commit/85762ee683299e34d391bd1eb1997389d0afa22e))

## [0.6.2](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.6.1...unchained-wallets-v0.6.2) (2023-10-26)

### Bug Fixes

- remove unused dependency which causes some downstream issues ([2aaa241](https://github.com/unchained-capital/unchained-wallets/commit/2aaa2416f8296022dd82c05eda0d443c5f0eddff))

## [0.6.1](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.6.0...unchained-wallets-v0.6.1) (2023-10-20)

### Bug Fixes

- bump @trezor/connect-web patch to fix downstream bug ([cc0beb1](https://github.com/unchained-capital/unchained-wallets/commit/cc0beb14e19bb6689182566ca8a434edc0a27196))

## [0.6.0](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.5.3...unchained-wallets-v0.6.0) (2023-09-14)

### Features

- trezor service dev URLs default to browser host. dont assume local ([3d7ffb3](https://github.com/unchained-capital/unchained-wallets/commit/3d7ffb36d5eba3577856b8ca1f071eac8be6b5ed))

## [0.5.3](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.5.2...unchained-wallets-v0.5.3) (2023-09-08)

### Bug Fixes

- update packages audit and uc-bitcoin ([3ba84c8](https://github.com/unchained-capital/unchained-wallets/commit/3ba84c87366921ec769fff7a3daee03208eeefbb))

## [0.5.2](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.5.1...unchained-wallets-v0.5.2) (2023-04-11)

### Bug Fixes

- change old cjs require to esm imports ([4361e47](https://github.com/unchained-capital/unchained-wallets/commit/4361e47887e5dc807a8e881fcb9b7d437ea4fe5b))

## [0.5.1](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.5.0...unchained-wallets-v0.5.1) (2023-03-31)

### Bug Fixes

- **dependencies:** bump uc-bitocin dependency ([cfa65ba](https://github.com/unchained-capital/unchained-wallets/commit/cfa65ba5443f711eb925bdf2779a78235b5e84e5))

## [0.5.0](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.4.1...unchained-wallets-v0.5.0) (2023-03-31)

### Features

- **policy:** order key origins when instantiating wallet policy ([80afda2](https://github.com/unchained-capital/unchained-wallets/commit/80afda2e8f9f89994e399386f5c89cb5aaab3727))
- **policy:** prefer uuid over name from wallet config ([95a9fd5](https://github.com/unchained-capital/unchained-wallets/commit/95a9fd55633cd7bac49c498c999bbb12ebda005f))

### Bug Fixes

- update readme with instructions on how to develop and use locally ([9098e67](https://github.com/unchained-capital/unchained-wallets/commit/9098e671d4d62a63e8bb16680792fda4df93b1dc))

## Changelog

## Version 0.1.0

## Changed

- Using webusb for ledger interactions rather than u2f
- not requiring verification for public key export
- updating ledger dependencies

## Version 0.0.11

### Changed

- (Minor) bumped dependency versions

## Version 0.0.10

### Added

- `ExportExtendedPublicKey` API works for Ledger devices now.

## Version 0.0.9

### Changed

- Major refactoring of API, interaction class hierarchy, and documentation.

## Version 0.0.8

### Added

- `CHANGELOG.md` file
- Implemented `GetMetadata` for Trezor & Ledger devices

### Changed

- API is unified, instead of calling `HardwareWalletExportPublicKey`
  and `HermitExportPubliicKey` you can now call `ExportPublicKey` and
  you will get back an instance of the correct class. This is a
  breaking change, as `HardwareWalletExportPublicKey` is no longer
  defined.
- Refactored Ledger API classes to no longer pass around an unneeded
  `network` parameter.
- Refactored Hermit API classes with properties & methods to make it
  easier to understand whether they read vs. display AND read QR codes
  as well as to more easily extract their encoded data. This is a
  breaking change, as encoded data was previously returned in the
  `messages` object; it is now available directly on the interaction
  via the `request()` method.
- Input & output amounts are forced to BigNumber.
- Updated dependency on `unchained-bitcoin` to `^0.0.6`
