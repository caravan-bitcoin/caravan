import { JADE } from "@caravan/wallets";

import publicKeyTests from "./publicKeys";
import extendedPublicKeyTests from "./extendedPublicKeys";
import { signingTests } from "./signing";
import addressTests from "./addresses";
import registrationTests from "./registration";

export default publicKeyTests(JADE)
  .concat(extendedPublicKeyTests(JADE))
  .concat(signingTests(JADE))
  .concat(addressTests(JADE))
  .concat(registrationTests(JADE));
