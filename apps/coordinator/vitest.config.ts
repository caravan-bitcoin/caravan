/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import type { UserConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()] as UserConfig['plugins'],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/tests-vitest/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    mockReset: true,
    deps: {
      inline: [
        '@caravan/wallets',
        '@caravan/bitcoin',
        'bitbox-api',
        '@ledgerhq/hw-transport-webusb',
        '@trezor/connect-web'
      ]
    }
  },
  resolve: {
    alias: {
      'bitbox-api': resolve(__dirname, '../../node_modules/bitbox-api'),
      '@ledgerhq/hw-transport-webusb': resolve(__dirname, '../../node_modules/@ledgerhq/hw-transport-webusb'),
      '@trezor/connect-web': resolve(__dirname, '../../node_modules/@trezor/connect-web')
    }
  }
}); 