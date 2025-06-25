import type { Plugin, PluginBuild } from "esbuild";

const headerText = `
if (typeof self === 'undefined') {
  var self;
  if (typeof window !== 'undefined') {
    self = window;
  } else if (typeof globalThis !== 'undefined') {
    self = globalThis;
  } else {
    self = {}
  }
}
`;

const headerBytes = Uint8Array.from(Array.from(headerText, c => c.charCodeAt(0)));
const n_header = headerBytes.length;

/**
 * A plugin that ensures the 'self' variable is defined in the global scope.
 * This is useful for packages that need to work in both browser and Node.js environments.
 */
export const provideSelf = (): Plugin => ({
  name: "provide-self",
  setup(build: PluginBuild) {
    build.onEnd((result) => {
      for (const file of result.outputFiles ?? []) {
        if (file.path.endsWith('.js') || file.path.endsWith('.mjs')) {
          const contentsIn = file.contents;
          const n_in = contentsIn.length;
          const contentsOut = new Uint8Array(n_in + headerBytes.length);
          for (let i = 0; i < n_header; i++) {
            contentsOut[i] = headerBytes[i];
          }
          for (let i = 0; i < n_in; i++) {
            contentsOut[i + n_header] = contentsIn[i];
          }
          file.contents = contentsOut;
        }
      }
    });
  }
});

/**
 * A plugin that provides a polyfill for the 'navigator' global object.
 * This is useful for packages that rely on navigator in environments where it's not available (like Node.js).
 */
export const provideNavigator = (options?: { userAgent?: string, language?: string }): Plugin => ({
  name: "provide-navigator",
  setup(build: PluginBuild) {
    const userAgent = options?.userAgent || 'nodejs';
    const language = options?.language || 'en-US';

    const navigatorText = `
if (typeof navigator === 'undefined') {
  var navigator = {
    userAgent: '${userAgent}',
    language: '${language}',
    languages: ['${language}'],
  }
}
`;

    const navigatorBytes = Uint8Array.from(Array.from(navigatorText, c => c.charCodeAt(0)));
    const n_navigator = navigatorBytes.length;

    build.onEnd((result) => {
      for (const file of result.outputFiles ?? []) {
        if (file.path.endsWith('.js') || file.path.endsWith('.mjs')) {
          const contentsIn = file.contents;
          const n_in = contentsIn.length;
          const contentsOut = new Uint8Array(n_in + navigatorBytes.length);
          for (let i = 0; i < n_navigator; i++) {
            contentsOut[i] = navigatorBytes[i];
          }
          for (let i = 0; i < n_in; i++) {
            contentsOut[i + n_navigator] = contentsIn[i];
          }
          file.contents = contentsOut;
        }
      }
    });
  }
});
