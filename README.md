<p align="center">
  <img src="./assets/images/caravan-logo-transparent.png" />
</p>

# Caravan Monorepo

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/caravan-bitcoin/caravan/pulls)
![Build Status](https://github.com/caravan-bitcoin/caravan/actions/workflows/ci.yml/badge.svg)
[![Vercel Deploy](https://therealsujitk-vercel-badge.vercel.app/?app=caravan-coordinator)](https://caravan-coordinator.vercel.app)
[![Hosted Coordinator](https://github.com/caravan-bitcoin/caravan/actions/workflows/deploy.yml/badge.svg)](https://caravan-bitcoin.github.io/caravan/#/)
![Package Publication](https://github.com/caravan-bitcoin/caravan/actions/workflows/release.yml/badge.svg)
[![Pulls from DockerHub](https://img.shields.io/docker/pulls/caravanbitcoin/coordinator?logo=docker)](https://hub.docker.com/r/caravanbitcoin/coordinator)

## Introduction

This is a monorepo project for the Caravan FOSS ecosystem, built with
[Turborepo](https://turbo.build/repo/docs).

There are two primary directories for managing projects:
- apps
- packages

The main app is a webapp forked from the original [Caravan project](https://github.com/unchained-capital/caravan)
which is being re-branded as the "Caravan Coordinator". The goal is to have many
more applications built within this ecosystem that can live under the caravan/apps directory.

`caravan/packages` is where the utility libraries live. Their foundation are forked versions of the [`unchained-bitcoin`](https://github.com/unchained-capital/unchained-bitcoin)
and [`unchained-wallets`](https://github.com/unchained-capital/unchained-wallets)
projects. These are being re-branded for legacy support
as `@caravan/bitcoin` and `@caravan/wallets` but moving forward
the expectation is that they will be split up as well. For
example the `psbt` module in `@caravan/bitcoin` will become
`@caravan/psbt`.


## Goals

There are a few goals for this new conception of the "Caravan"
project.

- Caravan is a familiar and trusted name in the javascript FOSS bitcoin ecosystem. Having the utility libraries that the coordinator relies on be under the same umbrella makes that relationship clearer
- Scoping libraries will help protect from supply chain attacks
- Moving the project into a monorepo will help improve and streamline the developer and deployment experience. Being able to test changes to the libraries in the coordinator immediately will create a faster feedback loop for development.
- Having tightly scoped libraries will make code easier and safer to audit and build out.
- Having a unified set of developer tooling (linting rules, deployment automation, etc.) also improves developer QoL and code reliability.


## Developers
The monorepo setup should make it easier for developers to test their changes
in a more realistic environment, especially when making changes to libraries
that are dependencies of the coordinator.

In the caravan monorepo we use `changesets` to manage versioning and releases.
A changeset will be _required_ for PRs to be merged. Read below to learn more.

### Changesets

#### Quickstart
Any PR to caravan that introduces a functional change requires a changeset be submitted with it.

Simply run the following command and follow the cli instructions:

```
$ npm run changeset
```

Learn about [semantic versioning](https://docs.npmjs.com/about-semantic-versioning) if you
are unsure whether your changes qualify as a patch, minor, or major change.

Pull Requests are checked for changesets by the [changeset-bot](https://github.com/apps/changeset-bot).

[Changesets GitHub Actions](https://github.com/changesets/action) are run to create a version PR
and publish on merge.

#### About Changesets
This is the [recommended way by Turborepo](https://turbo.build/repo/docs/handbook/publishing-packages/versioning-and-publishing)
to handle changelogs, versioning, and releases.
It's designed first as a manual process, so by default it won't "yell" at you to do
things correctly. This adds more flexibility over something like commitlint which
can have a steep learning curve and frustrating for new contributors.

Read the documentation for adding a changeset [here](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md)

And another good resource for what the workflow should look like [here](https://blog.logrocket.com/version-management-changesets/)

#### What is a changeset?

> A changeset is a Markdown file with YAML front matter. The contents of the Markdown is the change summary which will be written to the changelog and the YAML front matter describes what packages have changed and what semver bump types they should be

(source)[https://github.com/changesets/changesets/blob/main/docs/detailed-explanation.md#the-solution-changesets]

#### Relevant tooling

- CLI generation of new changesets
- Automated consumption of changesets to do versioning
- Detection + surfacing of changesets in PRs

[Automating Changesets](https://github.com/changesets/changesets/blob/main/docs/automating-changesets.md)

### Node.js Version Management

#### Required Versions
This project enforces specific Node.js and npm versions to ensure consistent lockfiles across all contributors:

```json
{
  "engines": {
    "node": ">=20.18.0 <21.0.0",
    "npm": ">=10.5.0 <11.0.0"
  }
}
```

#### Setup
Use the correct Node.js version before working on the project:

```shell
$ nvm use                    # Uses .nvmrc file
$ npm install               # Automatically checks versions
```

#### Pre-commit Hooks
Husky automatically runs pre-commit checks that:

- ✅ Verify your Node.js version matches requirements
- ✅ Validate package-lock.json changes are consistent
- ✅ Run linting (if available)

#### Common Issues

**Version mismatch during install:**
```shell
$ nvm use 20.18.0
$ npm install
```

**Pre-commit version error:**
```shell
$ nvm use
$ git commit    # Try again
```

**Large lockfile changes warning:**
- Usually means wrong Node.js version was used
- Check `node --version` and ensure it matches requirements
- Re-run `npm install` with correct version if needed

The system prevents lockfile conflicts by ensuring everyone uses compatible Node.js/npm versions.


## Getting started

### Quickstart

Clone the repo, install all dependencies, and run dev instances of
everything.

(Checkout the README for caravan/descriptors to make sure you can build the wasm dependencies.)

Install [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating) and run below commands in your terminal.

```shell
$ nvm use
$ npm install turbo --global
$ git clone https://github.com/caravan-bitcoin/caravan.git
$ cd caravan
$ npm install
$ turbo run dev # or `npm run dev`
```

#### What's happening?
The turbo.json file is the main config for the monorepo. You can read
about running tasks in Turborepo [here](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks#turborepo-can-multitask).

Note:

> After you've declared a task in turbo.json, it's up to you to implement it in your package.json manifests. You can add scripts all at once, or one workspace at a time. Turborepo will gracefully skip workspaces that don't include the task in their respective package.json manifest.

The main scripts to be run are defined in this config file:
`build`, `lint`, `test`, and `dev`.

## Development
One of the main benefits of a monorepo for this type of project is
being able to easily work with multiple dependencies you're developing
at the same time. Note for example that in the `caravan/coordinator`'s
package.json, the dependencies from the monorepo are referenced with
a simple `*` rather than a version or repository location.

### Running commands

```shell
$ turbo run test:debug --scope=@caravan/bitcoin --no-deps --no-cache
```

- scope says you want to just run the command for that package (`@caravan/bitcoin`)
- `--no-deps` is optional and says to skip any related packages. Without this, everything else that depends on `@caravan/bitcoin` will also be run
- `--no-cache` also optional and self-explanatory. Usually not necessary but turborepo does a lot of cacheing so good to be aware of.

### Dependencies
The `--no-deps` option highlights a lot of the benefits of the monorepo. If you make a change in one library,
anything else that relies on it should be tested to make sure they're not broken too.
If you want to break this coupling, a published package version can be referenced instead of
using `*` (this is not recommended however).

#### Note about internal packages

Sometimes it makes sense to move code you want to share between packages into an internal package.
In fact this is [recommended by Turborepo](https://turbo.build/repo/docs/crafting-your-repository/creating-an-internal-package#best-practices-for-internal-packages).

> When you're creating Internal Packages, it's recommended to create packages that have a single "purpose".

Internal packages should be added to the `devDependencies` list of the packages/apps that depend on them.
This is because the bundlers (tsup by default in caravan) won't include `dependencies` into the bundle
and then when the package is attempted to be installed by external downstream projects it will try
and find the internal dependency in a remote registry (which will fail). By including it in the
devDependency:

* the dependency graph will be correct
* the bundler will build it in with the final package
* other projects won't try and install the internal dependency

@caravan/multisig is an example of such a package that is depended on by other packages
like @caravan/psbt and @caravan/wallets.

### Adding a new package
NOTE: Turborepo provides [code generator capability](https://turbo.build/repo/docs/core-concepts/monorepos/code-generation)
for bootstrapping a new project. You can run `turbo gen` or `npm run gen`
from the root of the project and you will be prompted through some
bootstrapping questions.

You can keep reading this section to understand what's being built out
and write a fully functioning package yourself.

#### Manually adding a new package
`packages/caravan-psbt` is a good starting point for a simple package.

Let's make a package `@caravan/clients`. This is code that's being added
to caravan in [this PR](https://github.com/unchained-capital/caravan/pull/365)
but would be a good candidate for a standalone package.

1. Initialize the project directory
- `packages/caravan-clients`
- `cd packages/caravan-clients && npm init`
```shell
package name: @caravan/clients
version: 0.0.0
description: ...
entry point: ./dist/index.js
test command: jest src
keywords: ...
author: ...
license: MIT
```
This will initialize a package.json for you. But we want to add a few more fields for a final version:
```json
{
  "name": "@caravan/clients",
  "version": "0.0.0",
  "description": "...",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "module": "./dist/index.mjs",
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "npm run build -- --watch",
    "test": "jest src",
    "test:watch": "jest --watch src"
  },
  "keywords": [
    "bitcoin",
    "client",
    "mempool",
    "blockstream",
    "blockchain"
  ],
  "author": "Buck Perley",
  "license": "MIT",
  "engines": {
    "node": ">=16"
  },
  "devDependencies": {
    "@caravan/eslint-config": "*",
    "tsconfig": "*"
  }
}
```

- Install some more dependencies (from package dir):
```shell
$ npm install --save-dev typescript tsup eslint jest ts-jest
```

(alternatively can use the `--scope` arg to target the package from the root)

- Add configs: `eslintrc.js`, `tsconfig.json`, `jest.config.js`:
```javascript
// .eslintrc.js
module.exports = {
  root: true,
  extends: [
    "@caravan/eslint-config/library.js"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
};
```

```json
// tsconfig.json
{
  "extends": "@caravan/typescript-config/base.json"
}

```

```javascript
// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node"
};
```
- create a `src/` directory and add the entrypoint `index.ts` file
- add our module file(s) (e.g. `src/clients.ts`) and test file(s) (e.g. `src/clients.test.ts`)
  - NOTE: when these files were copied over, they came from caravan when not all files were converted to typescript. A `transform` field needed to be added to the jest config as well as `babel-jest` package to handle js transformations for those older files.
- You should now be able to run `turbo run test --scope=@caravan/clients` and `turbo run build --scope=@caravan/clients` to test and build
- To start using this in another package, say `caravan-coordinator` simply add it to the package.json with a `*`:
```json
{
  "dependencies": {
    ...,
    "@caravan/clients": "*",
    ...,
  }
}
```
- Run the development server with turbo: `turbo run dev`
- Add to `ClientPicker/index.tsx` (as an example):
```typescript
import { BlockchainClient, ClientType, PublicBitcoinProvider, Network } from "@caravan/clients";

...
  // add this function to the component and put it to use!
  const getFees = async () => {
    const client = new BlockchainClient({
      type: ClientType.PUBLIC,
      provider: PublicBitcoinProvider.MEMPOOL,
      network: Network.MAINNET,
    });
    return await client.getFeeEstimate(3);
  };
...
```
- Note that now not only if you make a change to `caravan/coordinator` the changes will be reflected almost instantly in the app, but you can also make a change to the dependencies and everything will rebuild (technically turborepo only rebuilds what is necessary, caching the rest). Add a console.log to the `getFeeEstimate` in the `BlockchainClient` app and see for yourself!

## Troubleshooting
- you might see an error "The request '...' failed to resolve only because it was resolved as fully specified"
Webpack has an [issue](https://github.com/webpack/webpack/issues/11467#issuecomment-691873586) by default
resolving the built module package if the extension is not specified. You can fix this by adding the following
rule to your webpack config (module.rules array):

```javascript
{
  test: /\.m?js/,
  resolve: {
      fullySpecified: false
  }
},
```
This will usually happen if a package was written trying to do a direct import of a file from a dependency and not
specifying the extension, for example:

```ts
import { reverseBuffer } from "bitcoinjs-lib/src/bufferutils";
```

instead of

```ts
import { reverseBuffer } from "bitcoinjs-lib/src/bufferutils.js";
```
