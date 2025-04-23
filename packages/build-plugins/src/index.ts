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
