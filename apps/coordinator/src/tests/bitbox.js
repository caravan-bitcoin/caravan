import { BITBOX } from "@caravan/wallets";

import publicKeyTests from "./publicKeys";
import extendedPublicKeyTests from "./extendedPublicKeys";
import { signingTests } from "./signing";
import addressTests from "./addresses";
import registrationTests from "./registration";

export default publicKeyTests(BITBOX)
  .concat(extendedPublicKeyTests(BITBOX))
  .concat(signingTests(BITBOX))
  .concat(addressTests(BITBOX))
  .concat(registrationTests(BITBOX));
