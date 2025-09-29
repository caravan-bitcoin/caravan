import {
  JADE,
  BITBOX,
  TREZOR,
  LEDGER,
  HERMIT,
  COLDCARD,
  BCUR2,
} from "@caravan/wallets";
import { TEST_FIXTURES } from "@caravan/bitcoin";

import jadeTests from "./jade";
import bitboxTests from "./bitbox";
import trezorTests from "./trezor";
import ledgerTests from "./ledger";
import hermitTests from "./hermit";
import coldcardTests from "./coldcard";
import bcur2Tests from "./bcur2";

const SUITE = {};

SUITE[JADE] = jadeTests;
SUITE[BITBOX] = bitboxTests;
SUITE[TREZOR] = trezorTests;
SUITE[LEDGER] = ledgerTests;
SUITE[HERMIT] = hermitTests;
SUITE[COLDCARD] = coldcardTests;
SUITE[BCUR2] = bcur2Tests;

const SEED = TEST_FIXTURES.bip39Phrase;

export { SUITE, SEED };
