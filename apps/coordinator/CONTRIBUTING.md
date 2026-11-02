# Contributing

Contributions are always welcome, no matter how large or small.

**Working on your first Pull Request?** You can learn how from this _free_ course [How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)

## Project setup

First, [fork](https://guides.github.com/activities/forking) and then clone the caravan repository:

```sh
git clone https://github.com/your-username/caravan
cd caravan
git remote add upstream https://github.com/caravan-bitcoin/caravan
```

Install dependencies:

```sh
npm install
```

Starting caravan locally (this will open caravan in your default browser):

```sh
npm run start
```

## Creating Pull Requests

1. Create a branch:

```sh
git checkout -b my-branch
```

2. Happy Hacking 🎉: Author your awesome code changes.

3. Ensure your changes pass linting and testing:

To test:

```sh
npm test
```

To lint your changes:

```sh
npm run lint
```

4. Commit your changes:

```sh
git add .
git commit -m "feat: short description of the change"
```

Conventional-commit-style prefixes (`feat:`, `fix:`, `chore:`, `docs:`) are common in the history but not strictly enforced. Versioning and changelogs are handled by [changesets](../../README.md#changesets) — see the Changesets section in the root README.

5. Push your changes:

```sh
git push origin my-branch
```

5. Open [this project on GitHub](https://github.com/caravan-bitcoin/caravan), then click “Compare & pull request”.

## Releasing Caravan

Caravan is released using vercel. New releases are automatically tagged, built and deployed with every new
commit to the `main` branch. New images are built when new version of caravan is released (determined
by changesets).

## Development Standards

### React Patterns

Caravan is a relatively old project at this point with a lot of code still having been built back in 2017/18.
As such, there are a lot of patterns that should be considered deprecated.. Instead we encourage the use of
more modern React coding patterns.

Some patterns to avoid:

- Class components. Prefer functional components with hooks.
- `renderSubComponent`. This is a bad pattern that should be avoided. Instead write a separate component. and just render it as a child.
- Redux
  - Sometimes this is unavoidable because of deeply embedded legacy code. When possible though
    try and use context, local state/hooks, and TanStack Query.
- Avoid using `connect` from `react-redux`. Instead use `useSelector` and `useDispatch` from `react-redux`.
- Upgrade to Typescript when possible.
- We have a lot of pre-built bitcoin utilities. Make sure you're not rewriting functionality that can be reused such as size estimation or bitcoin/sats conversion

### Application State

As mentioned above, the original version of Caravan relied heavily on redux for state management.
This should be considered an anti-pattern especially when the state is not required globally as
it adds unnecessary complexity.

For some situations however redux is already a dependency AND it's required in multiple places in the
app. Ideally we would like to migrate away from this but we don't want every PR to become a massive
rewrite either, so upgrades are encouraged when possible but not required.

The general rules for application state are:

- If the state is required globally and is already using redux, you MAY still use redux.
- If the state is only required in a sub-tree of the app, you should use context and local state/hooks.
- If there is global state that is dependent on network requests, it is encouraged to use TanStack Query.

#### TanStack Query

Unfortunately due to existing React dependencies, we couldn't use the latest version of TanStack Query.
Currently we are using [TanStack Query v4](https://tanstack.com/query/v4) which still has most of the
core functionality we need.

TanStack Query maintains a cache of data that can be accessed anywhere in the app. It is initialized
in the app entrypoint `src/index.jsx`. Whenever you need to build application state around
a network request, you should add the query to the [clients directory](./src/clients).
Here you should build out a query key map and the hooks that will be used to access the data
(either from the cache or from the network). This can also apply any transformations that might be required.

See the [transactions client](./src/clients/transactions.ts) for an example of how to build out a new query.


## In-app test suite (`/#/test`)

The coordinator ships an in-app keystore test suite at the `/#/test` route (mounted in `App.tsx`). It walks a connected keystore through a sequence of real device interactions and records pass/fail per step.

Suite composition: each keystore has `src/tests/<keystore>.js` that concatenates category modules. Current categories: `publicKeys`, `extendedPublicKeys`, `signing` (PSBTs), `addresses`, `registration`, and `messageSigning`. To add a new category, write a new `src/tests/<category>.jsx` exporting a `<category>Tests(keystore)` factory and append `.concat(<category>Tests(KEYSTORE))` to each supporting `src/tests/<keystore>.js`.

`messageSigning` covers Ledger / Trezor / Jade / BitBox / Coldcard; it signs a fixed UTF-8 message with the `open_source` cosigner key from `TEST_FIXTURES.multisigs` and verifies cryptographically via `verifyMessageSignature` from `@caravan/wallets`. BCUR2, Hermit, and Custom are intentionally omitted.

## Troubleshooting

### React "Unexpected fiber pop" in Chrome

If you encounter vague React errors like:

> Unexpected fiber pop

or similar cryptic messages, here’s why:

* Caravan is still on **React 17.0.0**
* Chrome’s **V8 engine** is stricter about context stack depth
* Complex components (e.g., Material-Table with nested MUI Tabs) create **deep context trees**
* This can trigger stack overflows → React throws misleading errors instead of the real one

✅ **Dev tip**:
Try reproducing in **Firefox** or **Safari**. Their JS engines handle deep nesting more gracefully, often surfacing the *actual underlying issue* (like an infinite re-render).

---

## Help needed

Please checkout the open issues for ideas of things to work on.
Also you can checkout caravan's official discord channel : https://discord.gg/GzndpdwkHU

Also, please watch the repo and respond to questions/bug reports/feature requests, Thanks!
