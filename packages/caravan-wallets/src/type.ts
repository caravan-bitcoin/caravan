// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { version } from "../package.json";
import {
  BITBOX
} from "./bitbox";
import {
  COLDCARD
} from "./coldcard";
import { CUSTOM } from "./custom";
import {
  HERMIT
} from "./hermit";
import {
  LEDGER,
  LEDGER_V2,
} from "./ledger";
import { TREZOR } from "./trezor";


/**
 * Current @caravan/wallets version.
 */
export const VERSION: string = version;

export const MULTISIG_ROOT = "m/45'";

/**
 * Keystores which support direct interactions.
 */
export const DIRECT_KEYSTORES = {
  BITBOX,
  TREZOR,
  LEDGER,
  LEDGER_V2,
} as const;

/**
 * Keystores which support indirect interactions.
 */
export const INDIRECT_KEYSTORES = {
  HERMIT,
  COLDCARD,
  CUSTOM,
} as const;

/**
 * Supported keystores.
 */
export const KEYSTORES = {
  ...DIRECT_KEYSTORES,
  ...INDIRECT_KEYSTORES,
} as const;

type KEYSTORE_KEYS = keyof typeof KEYSTORES;
export type KEYSTORE_TYPES = (typeof KEYSTORES)[KEYSTORE_KEYS];

