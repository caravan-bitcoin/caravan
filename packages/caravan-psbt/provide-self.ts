import { type Plugin } from 'esbuild'

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
`

const headerBytes = Uint8Array.from(Array.from(headerText, c => c.charCodeAt(0)))
const n_header = headerBytes.length

export default function ProvideSelf(): Plugin {
  return {
    name: 'provide-self',
    setup(build) {
      build.onEnd((result) => {
        for (const file of result.outputFiles ?? []) {
          if (file.path.endsWith('.js') || file.path.endsWith('.mjs')) {
            const contentsIn = file.contents
            const n_in = contentsIn.length
            const contentsOut = new Uint8Array(n_in + headerBytes.length)
            for (let i = 0; i < n_header; i++) {
              contentsOut[i] = headerBytes[i]
            }
            for (let i = 0; i < n_in; i++) {
              contentsOut[i + n_header] = contentsIn[i]
            }
            file.contents = contentsOut
          }
        }
      })
    }
  }
}
