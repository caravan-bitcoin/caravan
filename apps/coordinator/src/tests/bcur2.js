import { BCUR2 } from "@caravan/wallets";

import extendedPublicKeyTests from "./extendedPublicKeys";
import { signingTests } from "./signing";

export default extendedPublicKeyTests(BCUR2).concat(signingTests(BCUR2));
