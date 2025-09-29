import { getRelativeBip32Sequence } from '@caravan/bip32';
import {
  BitcoinNetwork,
  MultisigAddressType,
  ExtendedPublicKey,
  getPsbtVersionNumber,
  PsbtV2,
  bip32PathToSequence,
  bip32SequenceToPath,
} from '@caravan/bitcoin';
import {
  IJade,
  IJadeInterface,
  JadeTransport,
} from 'jadets';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, MockProxy } from 'vitest-mock-extended';

import {
  JadeInteraction,
  JadeGetMetadata,
  JadeExportPublicKey,
  JadeExportExtendedPublicKey,
  JadeRegisterWalletPolicy,
  JadeConfirmMultisigAddress,
  JadeSignMultisigTransaction,
  JadeSignMessage,
  JadeDependencies,
  variantFromAddressType,
  fingerprintFromHex,
  walletConfigToJadeDescriptor,
  getSignatureArray,
} from './jade';
import { MultisigWalletConfig } from './types';

// Mock modules
vi.mock('@caravan/bitcoin', () => ({
  ExtendedPublicKey: {
    fromBase58: vi.fn(),
  },
  getPsbtVersionNumber: vi.fn(),
  PsbtV2: vi.fn(),
  bip32PathToSequence: vi.fn(),
  bip32SequenceToPath: vi.fn(),
  P2SH: 'P2SH',
  P2WSH: 'P2WSH',
  P2SH_P2WSH: 'P2SH_P2WSH',
}));

vi.mock('@caravan/bip32', () => ({
  getRelativeBip32Sequence: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => Buffer.from('abcd1234', 'hex')),
}));

vi.mock('jadets', async () => {
  const actual = await vi.importActual('jadets');
  return {
    ...actual,
    base64ToBytes: vi.fn(() => new Uint8Array([1, 2, 3])),
    bytesToBase64: vi.fn(() => 'base64string'),
  };
});

describe('Jade', () => {
  let mockJade: MockProxy<IJade>;
  let mockJadeInterface: MockProxy<IJadeInterface>;
  let mockTransport: MockProxy<JadeTransport>;
  let dependencies: JadeDependencies;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });

    // Create type-safe mocks
    mockJade = mock<IJade>();
    mockJadeInterface = mock<IJadeInterface>();
    mockTransport = mock<JadeTransport>();

    // Set up default mock behaviors
    mockJade.connect.mockResolvedValue();
    mockJade.disconnect.mockResolvedValue();
    mockJade.authUser.mockResolvedValue(true);
    mockJade.getVersionInfo.mockResolvedValue({
      JADE_VERSION: '1.0.0',
      BOARD_TYPE: 'jade_v1',
    });
    mockJade.getXpub.mockResolvedValue('xpub_test');
    mockJade.getMasterFingerPrint.mockResolvedValue('12345678');
    mockJade.getMultiSigName.mockResolvedValue(null);
    mockJade.registerMultisig.mockResolvedValue();
    mockJade.getReceiveAddress.mockResolvedValue('bc1qtest');
    mockJade.signPSBT.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockJade.signMessage.mockResolvedValue('signature_base64');

    // Dependencies to inject
    dependencies = {
      jade: mockJade,
      jadeInterface: mockJadeInterface,
      transport: mockTransport,
    };

    // Set up mocked module functions
    (bip32PathToSequence as any).mockImplementation((path: string) =>
      path
        .split('/')
        .filter((p) => p && p !== 'm')
        .map((p) => parseInt(p.replace("'", ''), 10))
    );
    (bip32SequenceToPath as any).mockImplementation((seq: number[]) =>
      seq.join('/')
    );
    (getRelativeBip32Sequence as any).mockReturnValue([0, 1]);
    (ExtendedPublicKey.fromBase58 as any).mockReturnValue({
      pubkey: 'pubkey_hex',
    });
    (getPsbtVersionNumber as any).mockReturnValue(2);
    (PsbtV2 as any).mockImplementation(() => ({
      PSBT_GLOBAL_INPUT_COUNT: 1,
      PSBT_IN_BIP32_DERIVATION: [[{ key: '0xpubkey_hex', value: '12345678/0/0' }]],
      PSBT_IN_PARTIAL_SIG: [[{ key: '0xpubkey_hex', value: 'signature_hex' }]],
    }));
  });

  describe('JadeInteraction', () => {
    describe('withDevice', () => {
      it('connects, authenticates, runs function, and disconnects', async () => {
        const interaction = new JadeInteraction('mainnet', dependencies);
        const testResult = 'success';
        const result = await interaction.withDevice(async () => testResult);

        expect(result).toBe(testResult);
        expect(mockJade.connect).toHaveBeenCalledTimes(1);
        expect(mockJade.authUser).toHaveBeenCalledTimes(1);
        expect(mockJade.authUser).toHaveBeenCalledWith('mainnet', expect.any(Function));
        expect(mockJade.disconnect).toHaveBeenCalledTimes(1);
      });

      it('maps regtest to localtest', async () => {
        const interaction = new JadeInteraction('regtest', dependencies);
        await interaction.withDevice(async () => 'ok');

        expect(mockJade.authUser).toHaveBeenCalledWith('localtest', expect.any(Function));
      });

      it('handles auth failure', async () => {
        mockJade.authUser.mockResolvedValueOnce(false);
        const interaction = new JadeInteraction('mainnet', dependencies);

        await expect(interaction.withDevice(async () => 'test')).rejects.toThrow(
          'Failed to unlock Jade device'
        );
      });

      it('disconnects even if operation fails', async () => {
        const interaction = new JadeInteraction('mainnet', dependencies);
        const testError = new Error('Operation failed');

        await expect(
          interaction.withDevice(async () => {
            throw testError;
          })
        ).rejects.toThrow(testError.message);

        expect(mockJade.disconnect).toHaveBeenCalledTimes(1);
      });

      it('handles HTTP request failures in authUser', async () => {
        const interaction = new JadeInteraction('mainnet', dependencies);
        await interaction.withDevice(async () => 'test');

        // Get the httpRequestFn that was passed to authUser
        const authUserCall = mockJade.authUser.mock.calls[0];
        const httpRequestFn = authUserCall[1];

        // Mock fetch to fail for the auth request
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'HTTP error' }),
        });

        await expect(
          httpRequestFn({ urls: ['http://test.com'], data: {} })
        ).rejects.toThrow('HTTP request failed in authUser');
      });
    });

    describe('messages', () => {
      it('returns correct status messages', () => {
        const interaction = new JadeInteraction('mainnet', dependencies);
        const messages = interaction.messages();

        expect(messages).toContainEqual({
          state: 'pending',
          level: 'info',
          text: 'Please connect your Jade device.',
          code: 'device.setup',
        });
        expect(messages).toContainEqual({
          state: 'active',
          level: 'info',
          text: 'Communicating with Jade...',
          code: 'device.active',
        });
      });
    });
  });

  describe('JadeGetMetadata', () => {
    it('returns device info from jade.getVersionInfo', async () => {
      const versionInfo = {
        JADE_VERSION: '2.0.1',
        BOARD_TYPE: 'jade_v2',
      };
      mockJade.getVersionInfo.mockResolvedValueOnce(versionInfo);

      const interaction = new JadeGetMetadata('mainnet', dependencies);
      const result = await interaction.run();

      expect(result).toEqual({
        spec: `Jade v${versionInfo.JADE_VERSION}`,
        version: {
          major: '2',
          minor: '0',
          patch: '1',
          string: '2.0.1',
        },
        model: versionInfo.BOARD_TYPE,
      });
      expect(mockJade.getVersionInfo).toHaveBeenCalledTimes(1);
    });

    it('handles missing version', async () => {
      mockJade.getVersionInfo.mockResolvedValueOnce({ BOARD_TYPE: 'jade_v1' });

      const interaction = new JadeGetMetadata('mainnet', dependencies);
      const result = await interaction.run();

      expect(result.version.string).toBe('');
      expect(result.model).toBe('jade_v1');
    });
  });

  describe('JadeExportPublicKey', () => {
    const mockXpub = 'xpub_test_value';
    const mockFingerprint = 'abcd1234';

    beforeEach(() => {
      mockJade.getXpub.mockResolvedValue(mockXpub);
      mockJade.getMasterFingerPrint.mockResolvedValue(mockFingerprint);
      (ExtendedPublicKey.fromBase58 as any).mockReturnValue({
        pubkey: 'extracted_pubkey',
      });
    });

    it('exports public key from jade.getXpub', async () => {
      const interaction = new JadeExportPublicKey({
        bip32Path: "m/44'/0'/0'",
        includeXFP: false,
        dependencies,
      });

      const result = await interaction.run();
      
      expect(result).toBe('extracted_pubkey');
      expect(mockJade.getXpub).toHaveBeenCalledWith('mainnet', [44, 0, 0]);
      expect(ExtendedPublicKey.fromBase58).toHaveBeenCalledWith(mockXpub);
    });

    it('includes fingerprint when requested', async () => {
      const interaction = new JadeExportPublicKey({
        bip32Path: "m/44'/0'/0'",
        includeXFP: true,
        dependencies,
      });

      const result = await interaction.run();
      
      expect(result).toEqual({
        publicKey: 'extracted_pubkey',
        rootFingerprint: mockFingerprint,
      });
      expect(mockJade.getMasterFingerPrint).toHaveBeenCalledWith('mainnet');
    });
  });

  describe('JadeExportExtendedPublicKey', () => {
    const mockXpub = 'xpub_extended_test';
    const mockFingerprint = 'deadbeef';

    beforeEach(() => {
      mockJade.getXpub.mockResolvedValue(mockXpub);
      mockJade.getMasterFingerPrint.mockResolvedValue(mockFingerprint);
    });

    it('exports xpub from jade.getXpub', async () => {
      const interaction = new JadeExportExtendedPublicKey({
        bip32Path: "m/44'/0'/0'",
        includeXFP: false,
        dependencies,
      });

      const result = await interaction.run();
      expect(result).toBe(mockXpub);
    });

    it('includes fingerprint when requested', async () => {
      const interaction = new JadeExportExtendedPublicKey({
        bip32Path: "m/44'/0'/0'",
        includeXFP: true,
        dependencies,
      });

      const result = await interaction.run();
      expect(result).toEqual({
        xpub: mockXpub,
        rootFingerprint: mockFingerprint,
      });
    });
  });

  describe('JadeRegisterWalletPolicy', () => {
    const walletConfig: MultisigWalletConfig = {
      network: 'mainnet' as BitcoinNetwork,
      addressType: 'P2WSH' as MultisigAddressType,
      quorum: { requiredSigners: 2, totalSigners: 3 },
      extendedPublicKeys: [
        {
          xfp: '12345678',
          bip32Path: "m/48'/0'/0'/2'",
          xpub: 'xpub1...',
        },
      ],
    };

    it('registers new policy when not found', async () => {
      mockJade.getMultiSigName.mockResolvedValueOnce(null);

      const interaction = new JadeRegisterWalletPolicy({ walletConfig, dependencies });
      await interaction.run();

      expect(mockJade.getMultiSigName).toHaveBeenCalledTimes(1);
      expect(mockJade.registerMultisig).toHaveBeenCalledWith(
        'mainnet',
        'jadeabcd1234',
        expect.objectContaining({
          variant: 'wsh(multi(k))',
          sorted: true,
          threshold: 2,
        })
      );
    });

    it('skips registration if already exists', async () => {
      const existingName = 'existing_policy';
      mockJade.getMultiSigName.mockResolvedValueOnce(existingName);

      const interaction = new JadeRegisterWalletPolicy({ walletConfig, dependencies });
      await interaction.run();

      expect(mockJade.registerMultisig).not.toHaveBeenCalled();
    });
  });

  describe('JadeConfirmMultisigAddress', () => {
    const walletConfig: MultisigWalletConfig = {
      network: 'mainnet' as BitcoinNetwork,
      addressType: 'P2WSH' as MultisigAddressType,
      quorum: { requiredSigners: 2, totalSigners: 3 },
      extendedPublicKeys: [
        {
          xfp: '12345678',
          bip32Path: "m/48'/0'/0'/2'",
          xpub: 'xpub1...',
        },
      ],
    };

    it('confirms address for existing multisig', async () => {
      const existingName = 'existing_multisig';
      const expectedAddress = 'bc1q_test_address';
      mockJade.getMultiSigName.mockResolvedValueOnce(existingName);
      mockJade.getReceiveAddress.mockResolvedValueOnce(expectedAddress);

      const interaction = new JadeConfirmMultisigAddress({
        bip32Path: "m/48'/0'/0'/2'/0/0",
        walletConfig,
        dependencies,
      });

      const result = await interaction.run();
      
      expect(result).toBe(expectedAddress);
      expect(mockJade.getReceiveAddress).toHaveBeenCalledWith(
        'mainnet',
        expect.objectContaining({
          multisigName: existingName,
          paths: expect.any(Array),
        })
      );
    });

    it('registers then confirms if not found', async () => {
      const expectedAddress = 'bc1q_new_address';
      mockJade.getMultiSigName.mockResolvedValueOnce(null);
      mockJade.getReceiveAddress.mockResolvedValueOnce(expectedAddress);

      const interaction = new JadeConfirmMultisigAddress({
        bip32Path: "m/48'/0'/0'/2'/0/0",
        walletConfig,
        dependencies,
      });

      const result = await interaction.run();
      
      expect(result).toBe(expectedAddress);
      expect(mockJade.registerMultisig).toHaveBeenCalled();
      expect(mockJade.getReceiveAddress).toHaveBeenCalled();
    });
  });

  describe('JadeSignMultisigTransaction', () => {
    const walletConfig: MultisigWalletConfig = {
      network: 'mainnet' as BitcoinNetwork,
      addressType: 'P2WSH' as MultisigAddressType,
      quorum: { requiredSigners: 2, totalSigners: 3 },
      extendedPublicKeys: [],
    };

    it('signs PSBT and returns signed bytes', async () => {
      const signedBytes = new Uint8Array([4, 5, 6]);
      mockJade.signPSBT.mockResolvedValueOnce(signedBytes);

      const interaction = new JadeSignMultisigTransaction({
        walletConfig,
        psbt: 'base64psbt',
        returnSignatureArray: false,
        dependencies,
      });

      const result = await interaction.run();
      
      expect(result).toBe(signedBytes);
      expect(mockJade.signPSBT).toHaveBeenCalledWith('mainnet', expect.any(Uint8Array));
    });
  });

  describe('JadeSignMessage', () => {
    it('signs message using jade.signMessage', async () => {
      const expectedSignature = 'test_signature';
      const testMessage = 'Hello, Jade!';
      const testPath = "m/44'/0'/0'";
      mockJade.signMessage.mockResolvedValueOnce(expectedSignature);

      const interaction = new JadeSignMessage({
        bip32Path: testPath,
        message: testMessage,
        dependencies,
      });

      const result = await interaction.run();
      
      expect(result).toBe(expectedSignature);
      expect(mockJade.signMessage).toHaveBeenCalledWith([44, 0, 0], testMessage);
    });
  });

  describe('Helper functions', () => {
    describe('variantFromAddressType', () => {
      it('maps address types correctly', () => {
        expect(variantFromAddressType('P2SH' as MultisigAddressType)).toBe('sh(multi(k))');
        expect(variantFromAddressType('P2WSH' as MultisigAddressType)).toBe('wsh(multi(k))');
        expect(variantFromAddressType('P2SH_P2WSH' as MultisigAddressType)).toBe('sh(wsh(multi(k)))');
      });

      it('throws for unsupported address type', () => {
        expect(() => variantFromAddressType('INVALID' as MultisigAddressType))
          .toThrow('Unsupported addressType INVALID');
      });
    });

    describe('fingerprintFromHex', () => {
      it('converts hex string to Uint8Array', () => {
        const result = fingerprintFromHex('12345678');
        expect(result).toBeInstanceOf(Uint8Array);
        expect(Array.from(result)).toEqual([18, 52, 86, 120]);
      });
    });

    describe('walletConfigToJadeDescriptor', () => {
      it('creates proper descriptor from wallet config', () => {
        const config: MultisigWalletConfig = {
          network: 'mainnet' as BitcoinNetwork,
          addressType: 'P2WSH' as MultisigAddressType,
          quorum: { requiredSigners: 2, totalSigners: 3 },
          extendedPublicKeys: [
            {
              xfp: '12345678',
              bip32Path: "m/48'/0'/0'/2'",
              xpub: 'xpub1...',
            },
          ],
        };

        const result = walletConfigToJadeDescriptor(config);
        
        expect(result).toEqual({
          variant: 'wsh(multi(k))',
          sorted: true,
          threshold: 2,
          signers: expect.arrayContaining([
            expect.objectContaining({
              xpub: 'xpub1...',
              fingerprint: expect.any(Uint8Array),
              path: [],
            }),
          ]),
        });
      });
    });

    describe('getSignatureArray', () => {
      it('extracts signatures for matching fingerprint', () => {
        const mockPsbt = {
          PSBT_GLOBAL_INPUT_COUNT: 1,
          PSBT_IN_BIP32_DERIVATION: [[{ key: '0xabc123', value: '12345678/0/0' }]],
          PSBT_IN_PARTIAL_SIG: [[{ key: '0xabc123', value: 'sig_value' }]],
        };

        const result = getSignatureArray('12345678', mockPsbt);
        expect(result).toEqual(['sig_value']);
      });

      it('throws when derivations is not an array', () => {
        const mockPsbt = {
          PSBT_GLOBAL_INPUT_COUNT: 1,
          PSBT_IN_BIP32_DERIVATION: [null],
          PSBT_IN_PARTIAL_SIG: [[]],
        };

        expect(() => getSignatureArray('12345678', mockPsbt))
          .toThrow('bip32 derivations expected to be an array');
      });
    });
  });
});
