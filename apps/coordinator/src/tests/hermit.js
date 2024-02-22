import { HERMIT } from "@caravan/wallets";

import extendedPublicKeyTests from "./extendedPublicKeys";
import { signingTests } from "./signing";

export default extendedPublicKeyTests(HERMIT).concat(signingTests(HERMIT));
