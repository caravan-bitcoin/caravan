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
