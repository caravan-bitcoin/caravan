import { TREZOR } from "@caravan/wallets";

import publicKeyTests from "./publicKeys";
import extendedPublicKeyTests from "./extendedPublicKeys";
import addressTests from "./addresses";
import { signingTests } from "./signing";
import { messageSigningTests } from "./messageSigning";

export default publicKeyTests(TREZOR)
  .concat(extendedPublicKeyTests(TREZOR))
  .concat(signingTests(TREZOR))
  .concat(addressTests(TREZOR))
  .concat(messageSigningTests(TREZOR));
