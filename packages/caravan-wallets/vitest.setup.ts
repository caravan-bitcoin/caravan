import { vi } from "vitest";


global.Buffer = Buffer
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'https://example.com' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.XMLHttpRequest = dom.window.XMLHttpRequest;

// Mock bitcoinjs-lib-v6 to ensure initEccLib is called
vi.mock("bitcoinjs-lib-v6", async () => {
  const actual = await vi.importActual("bitcoinjs-lib-v6");
  return {
    ...actual,
    initEccLib: vi.fn(),
  };
});

