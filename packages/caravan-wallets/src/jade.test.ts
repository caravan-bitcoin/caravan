import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockJadeInstance: any;

vi.mock('jadets', () => {
  const base64ToBytes = vi.fn((str: string) => new Uint8Array([1, 2, 3]));
  const bytesToBase64 = vi.fn(() => 'base64string');

  return {
    Jade: vi.fn().mockImplementation(() => {
      // Re-create a fresh mock instance on each construction
      mockJadeInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        authUser: vi.fn().mockResolvedValue(true),
        getVersionInfo: vi.fn().mockResolvedValue({
          JADE_VERSION: '1.0.0',
          BOARD_TYPE: 'jade_v1',
        }),
        getXpub: vi.fn().mockResolvedValue(
          'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz'
        ),
        getMasterFingerPrint: vi.fn().mockResolvedValue('12345678'),
        getMultiSigName: vi.fn().mockResolvedValue(null),
        registerMultisig: vi.fn().mockResolvedValue(undefined),
        getReceiveAddress: vi.fn().mockResolvedValue('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'),
        signPSBT: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        signMessage: vi.fn().mockResolvedValue('signature_base64'),
      };
      return mockJadeInstance;
    }),
    SerialTransport: vi.fn().mockImplementation(() => ({})),
    JadeInterface: vi.fn().mockImplementation(() => ({})),
    base64ToBytes,
    bytesToBase64,
  };
});

vi.mock('@caravan/bitcoin', () => ({
  ExtendedPublicKey: {
    fromBase58: vi.fn().mockReturnValue({ pubkey: 'pubkey_hex' }),
  },
  getPsbtVersionNumber: vi.fn().mockReturnValue(2),
  PsbtV2: vi.fn().mockImplementation(() => ({
    PSBT_GLOBAL_INPUT_COUNT: 1,
    PSBT_IN_BIP32_DERIVATION: [[{ key: '0xpubkey_hex', value: '12345678/0/0' }]],
    PSBT_IN_PARTIAL_SIG: [[{ key: '0xpubkey_hex', value: 'signature_hex' }]],
  })),
  bip32PathToSequence: vi.fn((path: string) => {
    // Simple mock: m/44'/0'/0' -> [44, 0, 0]
    return path
      .split('/')
      .filter((p) => p && p !== 'm')
      .map((p) => parseInt(p.replace("'", '')));
  }),
  bip32SequenceToPath: vi.fn((seq: number[]) => seq.join('/')),
  P2SH: 'P2SH',
  P2WSH: 'P2WSH',
  P2SH_P2WSH: 'P2SH_P2WSH',
}));

vi.mock('@caravan/bip32', () => ({
  getRelativeBip32Sequence: vi.fn().mockReturnValue([0, 1]),
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockReturnValue(Buffer.from('abcd1234', 'hex')),
}));

// Base fetch mock (cleared per-test below but implementation preserved)
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ status: 'success' }),
});

import { Jade } from 'jadets';
import {
  JadeInteraction,
  JadeGetMetadata,
  JadeExportPublicKey,
  JadeExportExtendedPublicKey,
  JadeRegisterWalletPolicy,
  JadeConfirmMultisigAddress,
  JadeSignMultisigTransaction,
  JadeSignMessage,
} from './jade';

// Helper: get the specific Jade mock instance created most recently
const getLastJadeInstance = () =>
  (Jade as unknown as vi.Mock).mock.results.at(-1)!.value as any;

describe('JadeInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // keep fetch usable after clearAllMocks
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });
  });

  describe('withDevice', () => {
    it('connects, authenticates, runs function, and disconnects', async () => {
      const interaction = new JadeInteraction();
      const jade = getLastJadeInstance();

      const result = await interaction.withDevice(async () => 'success');

      expect(result).toBe('success');
      expect(jade.connect).toHaveBeenCalled();
      expect(jade.authUser).toHaveBeenCalled();
      expect(jade.disconnect).toHaveBeenCalled();
    });

    it('maps regtest to localtest', async () => {
      const interaction = new JadeInteraction('regtest');
      await interaction.withDevice(async () => 'ok');

      const jade = getLastJadeInstance();
      expect(jade.authUser).toHaveBeenCalledWith('localtest', expect.any(Function));
    });

    it('handles auth failure', async () => {
      const interaction = new JadeInteraction();
      const jade = getLastJadeInstance();
      jade.authUser.mockResolvedValueOnce(false);

      await expect(interaction.withDevice(async () => 'test')).rejects.toThrow(
        'Failed to unlock Jade device'
      );
    });

    it('disconnects even if operation fails', async () => {
      const interaction = new JadeInteraction();
      const jade = getLastJadeInstance();

      await expect(
        interaction.withDevice(async () => {
          throw new Error('Operation failed');
        })
      ).rejects.toThrow('Operation failed');

      expect(jade.disconnect).toHaveBeenCalled();
    });
  });
});

describe('JadeGetMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });
  });

  it('returns device info', async () => {
    const interaction = new JadeGetMetadata();
    const result = await interaction.run();

    expect(result).toEqual({
      spec: 'Jade v1.0.0',
      version: {
        major: '1',
        minor: '0',
        patch: '0',
        string: '1.0.0',
      },
      model: 'jade_v1',
    });
  });

  it('handles missing version', async () => {
    const interaction = new JadeGetMetadata();
    const jade = getLastJadeInstance();
    jade.getVersionInfo.mockResolvedValueOnce({ BOARD_TYPE: 'jade_v1' });

    const result = await interaction.run();

    expect(result.version.string).toBe('');
    expect(result.model).toBe('jade_v1');
  });
});

describe('JadeExportPublicKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });
  });

  it('exports public key', async () => {
    const interaction = new JadeExportPublicKey({
      bip32Path: "m/44'/0'/0'",
      includeXFP: false,
    });

    const result = await interaction.run();
    expect(result).toBe('pubkey_hex');
  });

  it('exports public key with fingerprint', async () => {
    const interaction = new JadeExportPublicKey({
      bip32Path: "m/44'/0'/0'",
      includeXFP: true,
    });

    const result = await interaction.run();
    expect(result).toEqual({
      publicKey: 'pubkey_hex',
      rootFingerprint: '12345678',
    });
  });
});

describe('JadeExportExtendedPublicKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });
  });

  it('exports xpub', async () => {
    const interaction = new JadeExportExtendedPublicKey({
      bip32Path: "m/44'/0'/0'",
      includeXFP: false,
    });

    const result = await interaction.run();
    expect(result).toBe(
      'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz'
    );
  });

  it('exports xpub with fingerprint', async () => {
    const interaction = new JadeExportExtendedPublicKey({
      bip32Path: "m/44'/0'/0'",
      includeXFP: true,
    });

    const result = await interaction.run();
    expect(result).toHaveProperty('xpub');
    expect(result).toHaveProperty('rootFingerprint');
  });
});

describe('JadeRegisterWalletPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });
  });

  const walletConfig = {
    network: 'mainnet' as any,
    addressType: 'P2WSH' as any,
    quorum: { requiredSigners: 2 },
    extendedPublicKeys: [
      {
        xfp: '12345678',
        bip32Path: "m/48'/0'/0'/2'",
        xpub: 'xpub1...',
      },
    ],
  };

  it('registers new policy', async () => {
    const interaction = new JadeRegisterWalletPolicy({ walletConfig });
    const jade = getLastJadeInstance();
    jade.getMultiSigName.mockResolvedValueOnce(null);

    await interaction.run();

    expect(jade.getMultiSigName).toHaveBeenCalled();
    expect(jade.registerMultisig).toHaveBeenCalledWith(
      'mainnet',
      'jadeabcd1234',
      expect.objectContaining({
        variant: 'wsh(multi(k))',
        sorted: true,
        threshold: 2,
      })
    );
  });

  it('skips if already registered', async () => {
    const interaction = new JadeRegisterWalletPolicy({ walletConfig });
    const jade = getLastJadeInstance();
    jade.getMultiSigName.mockResolvedValueOnce('existing_policy');

    await interaction.run();

    expect(jade.registerMultisig).not.toHaveBeenCalled();
  });
});

describe('JadeConfirmMultisigAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });
  });

  const walletConfig = {
    network: 'mainnet' as any,
    addressType: 'P2WSH' as any,
    quorum: { requiredSigners: 2 },
    extendedPublicKeys: [
      {
        xfp: '12345678',
        bip32Path: "m/48'/0'/0'/2'",
        xpub: 'xpub1...',
      },
    ],
  };

  it('confirms address for existing multisig', async () => {
    const interaction = new JadeConfirmMultisigAddress({
      bip32Path: "m/48'/0'/0'/2'/0/0",
      walletConfig,
    });
    const jade = getLastJadeInstance();
    jade.getMultiSigName.mockResolvedValueOnce('existing_multisig');

    const result = await interaction.run();
    expect(result).toBe('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    expect(jade.getReceiveAddress).toHaveBeenCalled();
  });

  it('registers then confirms if not found', async () => {
    const interaction = new JadeConfirmMultisigAddress({
      bip32Path: "m/48'/0'/0'/2'/0/0",
      walletConfig,
    });
    const jade = getLastJadeInstance();
    jade.getMultiSigName.mockResolvedValueOnce(null);

    const result = await interaction.run();
    expect(result).toBe('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    expect(jade.registerMultisig).toHaveBeenCalled();
  });
});

describe('JadeSignMultisigTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });
  });

  const walletConfig = {
    network: 'mainnet' as any,
    addressType: 'P2WSH' as any,
    quorum: { requiredSigners: 2 },
    extendedPublicKeys: [],
  };

  it('signs PSBT', async () => {
    const interaction = new JadeSignMultisigTransaction({
      walletConfig,
      psbt: 'base64psbt',
      returnSignatureArray: false,
    });
    const jade = getLastJadeInstance();

    const result = await interaction.run();
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
    expect(jade.signPSBT).toHaveBeenCalled();
  });

  it('returns signature array when requested', async () => {
    const interaction = new JadeSignMultisigTransaction({
      walletConfig,
      psbt: 'base64psbt',
      returnSignatureArray: true,
    });
    const jade = getLastJadeInstance();

    const result = await interaction.run();
    expect(result).toEqual(['signature_hex']);
    expect(jade.getMasterFingerPrint).toHaveBeenCalled();
  });
});

describe('JadeSignMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });
  });

  it('signs message', async () => {
    const interaction = new JadeSignMessage({
      bip32Path: "m/44'/0'/0'",
      message: 'Hello, Jade!',
    });
    const jade = getLastJadeInstance();

    const result = await interaction.run();
    expect(result).toBe('signature_base64');
    expect(jade.signMessage).toHaveBeenCalledWith([44, 0, 0], 'Hello, Jade!');
  });
});

describe('Helper functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });
  });

  it('walletConfigToJadeDescriptor creates proper descriptor', async () => {
    const walletConfig = {
      network: 'mainnet' as any,
      addressType: 'P2WSH' as any,
      quorum: { requiredSigners: 2 },
      extendedPublicKeys: [
        {
          xfp: '12345678',
          bip32Path: "m/48'/0'/0'/2'",
          xpub: 'xpub1...',
        },
        {
          xfp: '87654321',
          bip32Path: "m/48'/0'/0'/2'",
          xpub: 'xpub2...',
        },
      ],
    };

    const interaction = new JadeRegisterWalletPolicy({ walletConfig });
    const jade = getLastJadeInstance();
    jade.getMultiSigName.mockResolvedValueOnce(null);

    await interaction.run();

    expect(jade.registerMultisig).toHaveBeenCalledWith(
      'mainnet',
      expect.any(String),
      expect.objectContaining({
        variant: 'wsh(multi(k))',
        sorted: true,
        threshold: 2,
        signers: expect.arrayContaining([
          expect.objectContaining({
            xpub: 'xpub1...',
            fingerprint: expect.any(Uint8Array),
            derivation: expect.any(Array),
            path: [],
          }),
        ]),
      })
    );
  });

  it('handles different address types', async () => {
    const configs = [
      { addressType: 'P2SH', expected: 'sh(multi(k))' },
      { addressType: 'P2WSH', expected: 'wsh(multi(k))' },
      { addressType: 'P2SH_P2WSH', expected: 'sh(wsh(multi(k)))' },
    ];

    for (const { addressType, expected } of configs) {
      vi.clearAllMocks();
      (global.fetch as any) = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success' }),
      });

      const walletConfig = {
        network: 'mainnet' as any,
        addressType: addressType as any,
        quorum: { requiredSigners: 1 },
        extendedPublicKeys: [
          {
            xfp: '12345678',
            bip32Path: "m/48'/0'/0'/2'",
            xpub: 'xpub...',
          },
        ],
      };

      const interaction = new JadeRegisterWalletPolicy({ walletConfig });
      const jade = getLastJadeInstance();
      jade.getMultiSigName.mockResolvedValueOnce(null);

      await interaction.run();

      expect(jade.registerMultisig).toHaveBeenCalledWith(
        expect.any(String), // network
        expect.any(String), // multisig name
        expect.objectContaining({ variant: expected })
      );
    }
  });
});

