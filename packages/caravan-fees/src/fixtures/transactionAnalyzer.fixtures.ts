import { Network } from "@caravan/bitcoin";
import { AnalyzerOptions } from "../types";

export const baseOptions: AnalyzerOptions = {
  txHex: "",
  network: Network.TESTNET,
  targetFeeRate: 10,
  absoluteFee: "565",
  availableUtxos: [],
  dustThreshold: "546",
  changeOutputIndex: undefined,
  requiredSigners: 2,
  totalSigners: 3,
  addressType: "P2WSH",
};

export const rbfTxHex =
  "0100000001d648902eeb66bd0f178911b0a498732d5e3fc66759f38ba0fb7c3f2943eed3c00100000000fdffffff02c4a4000000000000160014d7993090f0a05b0b3d4874f43f87ea71749e6b02db87050000000000160014bf3037c4235c769005600fe3301fc0723f9fb53d00000000";

export const nonRbfTxHex =
  "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff08049d8e2f1b025e0fffffffff0100f2052a01000000434104bc760547261549265224df558f65bca88d4322429d88373ffff457c513b5cc912a1a7ee1f4d51d401713a64548e0095cdd94238764a9fe140534a83ee40e8e66ac00000000";

export const cpfpTxHex =
  "01000000030000000000000000000000000000000000000000000000000000000000000000ffffffff020132ffffffffaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0000000000ffffffffaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0000000000ffffffff0200f2052a010000004341044bba96f11c40ad31294391ac69d6bb29fbcf145db8f14aa6aea43e3ed0c748dd475b9fff383e6bfdd8ee3749b1d1e240298655d1aa3119f03d36736d41a98145ac00f2052a010000000000000000";

export const invalidTxHex =
  "010000000001000100e1f505000000001600143d908a60dab5aaf7a47d425c5c12d2e15c72c3670000000000";

export const noInputTxHex =
  "0100000000010100e1f505000000001600143d908a60dab5aaf7a47d425c5c12d2e15c72c3670000000000";

export const noOutputTxHex =
  "01000000019b42a5b77ab117ebe260dd9cc8d9839fb3d0df51fce987f7f0de7de82d0f1780000000006a4730440220128578ff3a3e186c3ec24b50984c45f6aba3da8e37a37b29686161efcd79e6270220464e2d9da4fafd5ac88dd36ecf9507a0af1de6c443ded547003a29a5b7654a76012103c11b722f0a8d12ee3ea9fc5d9ca91ffecab345ecceef1d5c78bc9761fb0638ffffffffff00000000";

export const highFeeRateTxHex =
  "0100000001d648902eeb66bd0f178911b0a498732d5e3fc66759f38ba0fb7c3f2943eed3c00100000000fdffffff01c4a4000000000000160014d7993090f0a05b0b3d4874f43f87ea71749e6b0200000000";

export const minTxHex =
  "0100000001d648902eeb66bd0f178911b0a498732d5e3fc66759f38ba0fb7c3f2943eed3c00100000000fdffffff01c4a4000000000000160014d7993090f0a05b0b3d4874f43f87ea71749e6b0200000000";
