#!/usr/bin/env python3
import subprocess
import sys

# List of files to restore from upstream/main
FILES = [
    ".github/ISSUE_TEMPLATE/feature_request.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "apps/coordinator/CONTRIBUTING.md",
    "apps/coordinator/README.md",
    "packages/build-plugins/src/index.ts",
    "packages/caravan-bitcoin/README.md",
    "packages/caravan-bitcoin/src/block_explorer.test.ts",
    "packages/caravan-bitcoin/src/braid.test.ts",
    "packages/caravan-bitcoin/src/inputs.test.ts",
    "packages/caravan-bitcoin/src/keys.test.ts",
    "packages/caravan-bitcoin/src/keys.ts",
    "packages/caravan-bitcoin/src/multisig.test.ts",
    "packages/caravan-bitcoin/src/multisig.ts",
    "packages/caravan-bitcoin/src/networks.test.ts",
    "packages/caravan-bitcoin/src/outputs.test.ts",
    "packages/caravan-bitcoin/src/p2sh_p2wsh.test.ts",
    "packages/caravan-bitcoin/src/p2wsh.test.ts",
    "packages/caravan-bitcoin/src/paths.test.ts",
    "packages/caravan-bitcoin/src/paths.ts",
    "packages/caravan-bitcoin/src/psbt.test.ts",
    "packages/caravan-bitcoin/src/psbtv2.test.ts",
    "packages/caravan-bitcoin/src/psbtv2.ts",
    "packages/caravan-bitcoin/src/script.test.ts",
    "packages/caravan-bitcoin/src/signatures.test.ts",
    "packages/caravan-bitcoin/src/transactions.test.ts",
    "packages/caravan-bitcoin/src/types/addresses.ts",
    "packages/caravan-bitcoin/src/types/keys.ts",
    "packages/caravan-bitcoin/src/utils.test.ts",
    "packages/caravan-psbt/README.md",
    "packages/caravan-psbt/src/index.ts",
    "packages/caravan-psbt/src/psbtv2/psbtv2.test.ts",
    "packages/caravan-psbt/vendor/tiny-secp256k1-asmjs/README.md",
    "packages/caravan-psbt/vendor/tiny-secp256k1-asmjs/lib/index.d.ts",
    "packages/caravan-psbt/vendor/tiny-secp256k1-asmjs/lib/validate.d.ts",
    "packages/caravan-psbt/vendor/tiny-secp256k1-asmjs/lib/wasm_loader.d.ts",
    "packages/caravan-wallets/src/bitbox.ts",
    "packages/caravan-wallets/src/coldcard.test.ts",
    "packages/caravan-wallets/src/coldcard.ts",
    "packages/caravan-wallets/src/custom.test.ts",
    "packages/caravan-wallets/src/custom.ts",
    "packages/caravan-wallets/src/fixtures/coldcard.fixtures.ts",
    "packages/caravan-wallets/src/hermit.ts",
    "packages/caravan-wallets/src/interaction.test.ts",
    "packages/caravan-wallets/src/interaction.ts",
    "packages/caravan-wallets/src/ledger.test.ts",
    "packages/caravan-wallets/src/ledger.ts",
    "packages/caravan-wallets/src/policy.test.ts",
    "packages/caravan-wallets/src/policy.ts",
    "packages/caravan-wallets/src/trezor.test.ts",
    "packages/caravan-wallets/src/trezor.ts",
    "packages/caravan-wallets/src/types/index.ts",
    "packages/caravan-wallets/vitest.config.ts",
    "packages/caravan-wallets/webusb/lib/TransportWebUSB.d.ts",
    "packages/caravan-wallets/webusb/lib/webusb.d.ts",
    "packages/multisig/src/index.ts",
]

def restore_file(path: str):
    """Run `git restore --source=upstream/main -- path`."""
    try:
        subprocess.run(
            ["git", "restore", "--source=upstream/main", "--", path],
            check=True
        )
        print(f"[✔] Restored: {path}")
    except subprocess.CalledProcessError as e:
        print(f"[✘] Failed to restore {path}: {e}", file=sys.stderr)

def main():
    for f in FILES:
        restore_file(f)

if __name__ == "__main__":
    main()

