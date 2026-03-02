import { BCUR2 } from "@caravan/wallets";

import extendedPublicKeyTests from "./extendedPublicKeys";
import { signingTests } from "./signing";
import registrationTests from "./registration";
import addressTests from "./addresses";

export default extendedPublicKeyTests(BCUR2)
  .concat(signingTests(BCUR2))
  .concat(registrationTests(BCUR2))
  .concat(addressTests(BCUR2));
