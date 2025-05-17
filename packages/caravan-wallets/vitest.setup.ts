import { JSDOM } from "jsdom";

const dom = new JSDOM(`<!doctype html><html><body></body></html>`);

// Patch window => indirect polyfills for jsdom
globalThis.window = dom.window as any;
