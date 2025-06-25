import { EXTENDED_PUBLIC_KEY_VERSIONS } from "../keys";

export type KeyPrefix = keyof typeof EXTENDED_PUBLIC_KEY_VERSIONS;
export type KeyVersion = typeof EXTENDED_PUBLIC_KEY_VERSIONS[KeyPrefix];
