/**
 * This module provides validation messages related to addresses.
 */

import {
  validate as bitcoinAddressValidation,
  Network as ValidationNetwork,
} from "bitcoin-address-validation";

import { Network } from "./networks";
import { MultisigAddressType } from "./types";

const MAINNET_ADDRESS_MAGIC_BYTE_PATTERN = "^(bc1|[13])";
const TESTNET_ADDRESS_MAGIC_BYTE_PATTERN = "^(tb1|bcrt1|[mn2])";
const REGTEST_ADDRESS_MAGIC_BYTE_PATTERN = "^(bcrt1|[mn2])";
const ADDRESS_BODY_PATTERN = "[A-HJ-NP-Za-km-z1-9]+$";
const BECH32_ADDRESS_MAGIC_BYTE_REGEX = /^(tb|bc)/;
const BECH32_ADDRESS_BODY_PATTERN = "[ac-hj-np-z02-9]+$";

/**
 * Validate a given bitcoin address.
 *
 * Address must be a valid address on the given bitcoin network.
 */
export function validateAddress(address: string, network: Network) {
  if (!address || address.trim() === "") {
    return "Address cannot be blank.";
  }

  const magic_byte_regex =
    network === Network.TESTNET
      ? TESTNET_ADDRESS_MAGIC_BYTE_PATTERN
      : network === Network.REGTEST
        ? REGTEST_ADDRESS_MAGIC_BYTE_PATTERN
        : MAINNET_ADDRESS_MAGIC_BYTE_PATTERN;
  const isBech32 = address.match(BECH32_ADDRESS_MAGIC_BYTE_REGEX);
  const address_body_regex = isBech32
    ? BECH32_ADDRESS_BODY_PATTERN
    : ADDRESS_BODY_PATTERN;
  const address_regex = magic_byte_regex + address_body_regex;
  // This tests whether you've got the network lined up with address type or not
  if (!address.match(address_regex)) {
    if (network == Network.REGTEST) {
      return "Address must start with one of 'bcrt1', 'm', 'n', or '2' followed by letters or digits.";
    } else if (network === Network.TESTNET) {
      return "Address must start with one of 'tb1', 'm', 'n', or '2' followed by letters or digits.";
    } else {
      return "Address must start with either of 'bc1', '1' or '3' followed by letters or digits.";
    }
  }

  let valid = bitcoinAddressValidation(
    address,
    network as unknown as ValidationNetwork,
  );

  if (!valid && network === Network.REGTEST) {
    // validation doesn't work for regtest p2pkh so will try for testnet
    valid = bitcoinAddressValidation(address, ValidationNetwork.testnet);
  }

  return valid ? "" : "Address is invalid.";
}

export function getAddressType(
  address: string,
  network: Network,
): MultisigAddressType {
  if (validateAddress(address, network) !== "") {
    return "UNKNOWN";
  }
  const bech32Regex = /^(bc1|tb1|bcrt1)/;
  const p2pkhRegex = /^(1|m|n)/;
  const p2shRegex = /^(3|2)/;

  if (address.match(bech32Regex)) {
    if (
      address.startsWith("bc1p") ||
      address.startsWith("tb1p") ||
      address.startsWith("bcrt1p")
    ) {
      return "P2TR";
    }
    return "P2WSH";
  } else if (address.match(p2pkhRegex)) {
    return "P2PKH";
  } else if (address.match(p2shRegex)) {
    return "P2SH";
  }
  return "UNKNOWN";
}
