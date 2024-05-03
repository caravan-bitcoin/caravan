# @caravan/clients

## 0.1.1

### Patch Changes

- [#88](https://github.com/caravan-bitcoin/caravan/pull/88) [`180ced6`](https://github.com/caravan-bitcoin/caravan/commit/180ced667fb3b7e4b32b03e885662e4dde934c75) Thanks [@jbrauck-unchained](https://github.com/jbrauck-unchained)! - Rescan functionality was not correctly being passed into bitcoindImportDescriptors which it needs to be in order to correctly set timestamp equal to "0" when rescan equals true.

## 0.1.0

### Minor Changes

- [#76](https://github.com/caravan-bitcoin/caravan/pull/76) [`6c04ac4`](https://github.com/caravan-bitcoin/caravan/commit/6c04ac497b9fcd227b821b0d5ccb8b5291a24d18) Thanks [@bucko13](https://github.com/bucko13)! - Caravan Coordinator:
  Adds descriptor import support for caravan coordinator. This is a backwards incompatible
  change for instances that need to interact with bitcoind nodes older than v21 which introduced
  descriptor wallets.

  @caravan/clients

  - named wallet interactions
  - import descriptor support

## 0.0.3

### Patch Changes

- [#39](https://github.com/caravan-bitcoin/caravan/pull/39) [`09a4ad8`](https://github.com/caravan-bitcoin/caravan/commit/09a4ad8a82096ef2c42b4df926bd87a982223c0e) Thanks [@bucko13](https://github.com/bucko13)! - Fixes a bug in the mempool broadcast request

## 0.0.2

### Patch Changes

- [#34](https://github.com/caravan-bitcoin/caravan/pull/34) [`b4e349c`](https://github.com/caravan-bitcoin/caravan/commit/b4e349c170a83d4e0d153bfec62a97170e534fda) Thanks [@bucko13](https://github.com/bucko13)! - Update mempool client host

## 0.0.1

### Patch Changes

- [#24](https://github.com/caravan-bitcoin/caravan/pull/24) [`00a550f`](https://github.com/caravan-bitcoin/caravan/commit/00a550f6675d7d0a90f4e572aeac3d07f8759f36) Thanks [@bucko13](https://github.com/bucko13)! - make sure build files are included in publication
