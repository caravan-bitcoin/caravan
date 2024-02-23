# Caravan Descriptors

## Installation

1. clone
2. install [rust toolchain](https://www.rust-lang.org/tools/install) and `cargo install wasm-pack`
3. npm install in the main directory
4. cd to the caravan-rs directory and `wasm-pack build -t nodejs` to build the `pkg/` directory (not clear yet if nodejs is the right target or how to make it more flexible)
   1. You might need to install llvm/clang
   2. Will also need to setup paths to build libsecp

```
export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
# for older homebrew installs
# export PATH="/usr/local/opt/llvm/bin:$PATH"
export CC=/opt/homebrew/opt/llvm/bin/clang
export AR=/opt/homebrew/opt/llvm/bin/llvm-ar
```

## Usage
You can use npm scripts from the main directory to do all building

```shell
$ npm run build
```
This will cd into the rust directory, build packages for web and node
targets, and then build the artifacts for the js library to be packaged
and used.

```shell
$ npm run test
```
This will run the TypeScript tests only.


### Web
You'll need to make sure that the web environment this is used in
supports wasm. For example, if you're using in a vite.js project
you'll need the `vite-plugin-wasm` plugin.

Also note that all functions exported are async and need to be awaited
since they will load up the wasm modules to be used (this way consumers
of the library don't have to worry about loading up the modules themselves)


## API
NOTE: This is subject to change as this is still very much alpha

The two main functions available for import are:

### encodeDescriptors
Takes a config for a multisig wallet and encodes it into
the two corresponding descriptors

### decodeDescriptors
Take two descriptors and convert them into a multisig wallet
config object. This will make it possible to determine and parse the wallet type
(e.g. P2SH) and the key origins.
