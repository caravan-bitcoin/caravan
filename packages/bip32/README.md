# Bip32 Utilities

## Paths

### `secureSecretPath`

Generates a random BIP32 path of a given depth. The randomness is generated using the Node.js crypto module. This can be used for blinding an xpub. The function ensures that the depth is an integer and less than 32.

### `combineBip32Paths`

Given two BIP32 paths, combine them into a single path.
Useful for creating blinded xpubs when you have the source
path and want to append the randomly generated one

### `getUnmaskedPath`

Given a derivation and a global xpub, return the unmasked path
that can be used to derive the child pubkey from the global xpub.
This is useful when you have a child xpub (e.g. a blinded xpub) derived
from a masked xpub and you need to generate the full, unmasked path.

### `getRelativeBip32Sequence`

A utility to use when you have a parent and child bip32 paths and want the "relative"
sequence (the path elements from the child that are added on to the parent).

## Keys

### `getRandomChildXpub`

Given a source xpub, derive a child xpub at a random path using secureSecretPath
defaults to depth 4. Useful for creating blinded xpubs or generating random child xpubs (e.g. strands)

### `getMaskedKeyOrigin`

Derive a masked key origin from an xpub. Useful for generating
descriptors and wallet configurations for keys that don't need to have their
key origin info revealed.
Bip32 path will use all 0s for the depth of the given xpub and the
root fingerprint will be set to the parent fingerprint of the xpub

### `isValidChildPubKey`

When you have a global xpub from a PSBT, it's useful to make
sure that a child pubkey can be derived from that psbt. Sometimes
the pubkey derivation comes from a masked and/or blinded xpub.
So we need to combine the child derivation with the global
and confirm that the pubkey can be derived from that source

### `setXpubNetwork`

Sets and updates serialization of xpub for a network accordingly.

### `getBlindedXpub`

Given a source xpub, derive a blinded xpub at a random path.
Will target 128 bits of entropy for the path with a depth of 4.
