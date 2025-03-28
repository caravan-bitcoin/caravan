import { describe, it, expect, beforeEach } from 'vitest';
import * as sliceUtils from '../utils/slices';
import {
  DEFAULT_PREFIX,
  DEFAULT_CHANGE_PREFIX,
  CHANGE_INDEX,
} from '../utils/constants';

describe('slices utils', () => {
  describe('compareSlicesByTime', () => {
    let a;
    let b;
    let c;
    const desc = 'desc';

    beforeEach(() => {
      a = {
        bip32Path: 'm/0/5',
        lastUsed: '04/20/2020',
        lastUsedTime: 1587458800000,
        utxos: [
          {
            time: 1587358800000,
          },
          {
            time: 1587458800000,
          },
        ],
      };
      b = {
        bip32Path: 'm/0/6',
        lastUsed: '04/23/2020',
        lastUsedTime: 1587758800000,
        utxos: [
          {
            time: 1587458800000,
          },
          {
            time: 1587758800000,
          },
        ],
      };
      c = {
        bip32Path: 'm/0/7',
        lastUsed: 'Spent',
        utxos: [],
      };
    });

    it('should correctly compare slices by lastUsed', () => {
      // a is before b
      expect(sliceUtils.compareSlicesByTime(a, b)).toBe(1);
      expect(sliceUtils.compareSlicesByTime(a, b, desc)).toBe(-1);

      // b is before a
      a.lastUsed = '04/23/2020';
      a.lastUsedTime = 1587758800000;
      b.lastUsed = '04/20/2020';
      b.lastUsedTime = 1587458800000;
      expect(sliceUtils.compareSlicesByTime(a, b)).toBe(-1);

      // a and b are at the same time
      b.lastUsed = a.lastUsed;
      b.lastUsedTime = a.lastUsedTime;
      expect(sliceUtils.compareSlicesByTime(a, b)).toBe(0);

      // b is undefined
      b.lastUsed = undefined;
      b.lastUsedTime = undefined;
      expect(sliceUtils.compareSlicesByTime(a, b)).toBe(-1);

      // a is undefined
      b.lastUsed = a.lastUsed;
      b.lastUsedTime = a.lastUsedTime;
      a.lastUsed = undefined;
      a.lastUsedTime = undefined;
      expect(sliceUtils.compareSlicesByTime(a, b)).toBe(1);
    });

    it('should correctly compare by utxo list', () => {
      // lastUsed is checked first so need to reset to get to utxo checks
      a.lastUsed = undefined;
      a.lastUsedTime = undefined;
      b.lastUsed = undefined;
      b.lastUsedTime = undefined;

      expect(sliceUtils.compareSlicesByTime(a, b)).toBe(1);
      expect(sliceUtils.compareSlicesByTime(a, b, desc)).toBe(-1);

      a.utxos = [];
      expect(sliceUtils.compareSlicesByTime(a, b)).toBe(-1);
      expect(sliceUtils.compareSlicesByTime(a, b, desc)).toBe(1);

      b.utxos = [];
      expect(sliceUtils.compareSlicesByTime(a, b)).toBe(0);
    });

    it('should correctly compare Spent slices', () => {
      // when ascending, spent is after unspent and before unused
      // compare unspent and spent
      expect(sliceUtils.compareSlicesByTime(a, c)).toBe(-1);
      expect(sliceUtils.compareSlicesByTime(a, c, desc)).toBe(1);

      // compare spent and unused
      b.utxos = [];
      expect(sliceUtils.compareSlicesByTime(b, c)).toBe(-1);
      expect(sliceUtils.compareSlicesByTime(b, c, desc)).toBe(1);
    });
  });

  describe('isChange', () => {
    it('should correctly indicate if a path represents a change braid', () => {
      const validChange = [
        `${DEFAULT_CHANGE_PREFIX}1`,
        `${DEFAULT_CHANGE_PREFIX}50`,
        `m/45'/0'${CHANGE_INDEX}/0`,
      ];
      const invalidChange = [
        `${DEFAULT_PREFIX}/0/1`,
        `${DEFAULT_PREFIX}/0/50`,
        "m/45'/0'/0/0",
        "m/45'/0'/1",
        '0/1',
        '1/1', // looks like change but we want to require a prefix
      ];

      validChange.forEach((path) => {
        expect(sliceUtils.isChange(path)).toBe(true);
      });

      invalidChange.forEach((path) => {
        expect(sliceUtils.isChange(path)).toBe(false);
      });
    });
  });

  describe('compareSlicesByPath', () => {
    it('should throw error if both slices are missing BIP32 path', () => {
      const a = { change: false };
      const b = { change: false };
      expect(() => sliceUtils.compareSlicesByPath(a, b)).toThrow('Mising BIP32 path for comparing slices.');
    });

    it('should compare slices by change status', () => {
      const a = { change: true, bip32Path: 'm/0/1' };
      const b = { change: false, bip32Path: 'm/0/2' };
      expect(sliceUtils.compareSlicesByPath(a, b)).toBe(-1);
      expect(sliceUtils.compareSlicesByPath(b, a)).toBe(1);
    });

    it('should compare slices by last number in path', () => {
      const a = { change: false, bip32Path: 'm/0/2' };
      const b = { change: false, bip32Path: 'm/0/1' };
      expect(sliceUtils.compareSlicesByPath(a, b)).toBe(-1);
      expect(sliceUtils.compareSlicesByPath(b, a)).toBe(1);
    });
  });

  describe('compareSlicesByBalance', () => {
    it('should throw error if both slices are missing balance', () => {
      const a = { change: false };
      const b = { change: false };
      expect(() => sliceUtils.compareSlicesByBalance(a, b)).toThrow('Missing balance for comparing slices');
    });

    it('should compare slices by balance', () => {
      const a = { balanceSats: { isEqualTo: () => false, isGreaterThan: () => true } };
      const b = { balanceSats: { isEqualTo: () => false, isGreaterThan: () => false } };
      expect(sliceUtils.compareSlicesByBalance(a, b)).toBe(-1);
      expect(sliceUtils.compareSlicesByBalance(b, a)).toBe(1);
    });

    it('should return 0 for equal balances', () => {
      const a = { balanceSats: { isEqualTo: () => true, isGreaterThan: () => false } };
      const b = { balanceSats: { isEqualTo: () => true, isGreaterThan: () => false } };
      expect(sliceUtils.compareSlicesByBalance(a, b)).toBe(0);
    });
  });

  describe('compareSlicesByUTXOCount', () => {
    it('should throw error if both slices are missing utxos', () => {
      const a = { change: false };
      const b = { change: false };
      expect(() => sliceUtils.compareSlicesByUTXOCount(a, b)).toThrow('Missing utxo array for comparing slices');
    });

    it('should compare slices by UTXO count', () => {
      const a = { utxos: [1, 2, 3] };
      const b = { utxos: [1, 2] };
      expect(sliceUtils.compareSlicesByUTXOCount(a, b)).toBe(-1);
      expect(sliceUtils.compareSlicesByUTXOCount(b, a)).toBe(1);
    });

    it('should return 0 for equal UTXO counts', () => {
      const a = { utxos: [1, 2] };
      const b = { utxos: [1, 2] };
      expect(sliceUtils.compareSlicesByUTXOCount(a, b)).toBe(0);
    });
  });
}); 