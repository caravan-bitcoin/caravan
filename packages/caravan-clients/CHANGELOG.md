# @caravan/clients

## 0.5.0

### Minor Changes

- [#244](https://github.com/caravan-bitcoin/caravan/pull/244) [`2fdced3`](https://github.com/caravan-bitcoin/caravan/commit/2fdced3ec1c51ed8df5b5d91f88386cb2302bb94) Thanks [@waldenraines](https://github.com/waldenraines)! - separate public/private and blockchain explorer concerns

## 0.4.1

### Patch Changes

- [#225](https://github.com/caravan-bitcoin/caravan/pull/225) [`049d730`](https://github.com/caravan-bitcoin/caravan/commit/049d730f0dc1bac7ba854f26192ca79afa03afe9) Thanks [@Legend101Zz](https://github.com/Legend101Zz)! - Value Column Integration for Transaction Table

## 0.4.0

### Minor Changes

- [#206](https://github.com/caravan-bitcoin/caravan/pull/206) [`08a485d`](https://github.com/caravan-bitcoin/caravan/commit/08a485d382847d1af234ebb0f37628e12f4186e7) Thanks [@Legend101Zz](https://github.com/Legend101Zz)! - Add a new method `getWalletTransaction` in BlockchainClient and `bitcoindGetWalletTransaction` in wallet methods

## 0.3.2

### Patch Changes

- [#168](https://github.com/caravan-bitcoin/caravan/pull/168) [`accc093`](https://github.com/caravan-bitcoin/caravan/commit/accc0937159691e7be5b0b68c389ee6594423aa4) Thanks [@Legend101Zz](https://github.com/Legend101Zz)! - Patch: align client.getTransaction method implementation with bitcoindRawTxData response

## 0.3.1

### Patch Changes

- [#196](https://github.com/caravan-bitcoin/caravan/pull/196) [`509436c`](https://github.com/caravan-bitcoin/caravan/commit/509436cf299ee83de481557928eb8638b20ec62e) Thanks [@Legend101Zz](https://github.com/Legend101Zz)! - fix: Private node transaction RPC call by aligning client.getTransaction method implementation with bitcoindRawTxData response

## 0.3.0

### Minor Changes

- [#134](https://github.com/caravan-bitcoin/caravan/pull/134) [`c220696`](https://github.com/caravan-bitcoin/caravan/commit/c220696fa16c9663995835a96a5a56c88977cc8e) Thanks [@Legend101Zz](https://github.com/Legend101Zz)! - Add getTransaction method to BlockchainClient and migrate files (blockchain.js, block_explorer.ts,bitcoind.js) to TypeScript

## 0.2.0

### Minor Changes

- [#112](https://github.com/caravan-bitcoin/caravan/pull/112) [`7cf2bf4`](https://github.com/caravan-bitcoin/caravan/commit/7cf2bf48ebda2d8dc45c6a83068a5dc5ce028beb) Thanks [@Harshil-Jani](https://github.com/Harshil-Jani)! - @caravan/client
  We are exposing a new method `getAddressTransactions` which will fetch all the transaction for a given address and format it as per needs. To facilitate the change, we had moved the interfaces in the new file `types.ts`.

  Another change was about getting the block fee-rate percentile history from mempool as a client.

  @caravan/bitcoin
  The new function that has the capability to detect the address type (i.e P2SH, P2PKH, P2WSH or P2TR) was added.

  Overall, The changes were to support the new library within caravan called @caravan/health.

### Patch Changes

- Updated dependencies [[`7cf2bf4`](https://github.com/caravan-bitcoin/caravan/commit/7cf2bf48ebda2d8dc45c6a83068a5dc5ce028beb)]:
  - @caravan/bitcoin@0.3.0

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
