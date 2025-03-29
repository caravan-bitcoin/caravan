import { BITBOX, TREZOR, LEDGER, HERMIT, COLDCARD } from "@caravan/wallets";
import { TEST_FIXTURES } from "@caravan/bitcoin";

import bitboxTests from "./bitbox";
import trezorTests from "./trezor";
import ledgerTests from "./ledger";
import hermitTests from "./hermit";
import coldcardTests from "./coldcard";

const SUITE = {};

SUITE[BITBOX] = bitboxTests;
SUITE[TREZOR] = trezorTests;
SUITE[LEDGER] = ledgerTests;
SUITE[HERMIT] = hermitTests;
SUITE[COLDCARD] = coldcardTests;

const SEED = TEST_FIXTURES.bip39Phrase;

export { SUITE, SEED };
