import { TextEncoder, TextDecoder } from "util";
import "@inrupt/jest-jsdom-polyfills";

// Polyfill TextEncoder and TextDecoder
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Define `self` for environments where it's not available (like Node.js)
(global as any).self = global;

// Polyfill missing properties for `Window` type compatibility
(global as any).name = "";
