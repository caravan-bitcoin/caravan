// This file is similar to jest.setup.ts but for Vitest
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import '@inrupt/jest-jsdom-polyfills';

// Global test setup 

// Mock hardware wallet dependencies
vi.mock('bitbox-api', () => ({
  default: {
    // Add mock implementations as needed
  }
}));

vi.mock('@ledgerhq/hw-transport-webusb', () => ({
  default: {
    // Add mock implementations as needed
  }
}));

vi.mock('@trezor/connect-web', () => ({
  default: {
    // Add mock implementations as needed
  }
})); 