// leaving these exports here to avoid breaking changes
// these used to be exported from @caravan/wallets, but
// they are now exported from @caravan/multisig.
export type {
  MultisigWalletConfig,
  LegacyInput,
  LegacyOutput,
  BraidDetails,
} from "@caravan/multisig";

export {
  MultisigWalletPolicy,
  braidDetailsToWalletConfig,
  getPolicyTemplateFromWalletConfig,
  getKeyOriginsFromWalletConfig,
  getTotalSignerCountFromTemplate,
  validateMultisigPolicyKeys,
  validateMultisigPolicyScriptType,
  validateMultisigPolicyTemplate,
} from "@caravan/multisig";
