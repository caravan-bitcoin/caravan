# Caravan - Stateless Multisig Coordinator

Caravan is making bitcoin multisig custody easier and safer through
transparency and standards.

Caravan is a coordination software. It connects to a source of
consensus and your keys to build and interact with multisig bitcoin
addresses.

Caravan is also stateless. It does not itself store any data. You must
safekeep the addresses (and redeem scripts & BIP32 paths) you create.

[Try Caravan now!](https://caravan-bitcoin.github.io/caravan)

## Installation

Caravan is a stateless pure HTML & JavaScript web application. It can
be run in any web browser from a local or remote installation.

### Caravan Bitcoin Github

The simplest way to use Caravan is to visit
[https://caravan-bitcoin.github.io/caravan](https://caravan-bitcoin.github.io/caravan),
a copy of Caravan hosted on GitHub by
[Unchained Capital](https://www.unchained.com).

### Your Own GitHub

If you would prefer to host your own copy of Caravan on GitHub, you
can do so by first forking the
[Caravan repository](https://github.com/caravan-bitcoin/caravan)
into your own GitHub organization. Go to the (newly forked) repository's "Settings" page and
scroll down to the "GitHub Pages" section. Make sure to setup the settings
to us a gh-pages branch (create the branch if necessary).

You may need to run a deploy manually from your computer for the first time.

```shell
$ git clone https://YOUR_GITHUB_USERNAME.github.io/caravan
$ cd caravan
$ npm install
$ turbo run deploy
```

You should see a copy of the Caravan web application at
`https://YOUR_GITHUB_USERNAME.github.io/caravan`. If not, go back to the
GitHub Pages section and ensure you see a message
saying "Your site is published at ...".

### Host Locally

You can always clone the source code of Caravan to your local machine
and run it from there. You will require a recent `npm` installation.

```bash
$ git clone https://github.com/caravan-bitcoin/caravan
...
$ cd caravan
$ npm install
...
$ npm run dev:coordinator
...
```

Now visit http://localhost:5173/# to interact with your local copy of
Caravan.

### Host Remotely

Once you have downloaded the source code and used `npm` to install
dependencies (see section above), you can pre-build the React
application for a production deployment and then host the contents of
the resulting `build` directory via a webserver such as `nginx`.

```bash
$ npm run build:coordinator
...
```

You can test the production build locally at http://localhost:4173 by running:

```bash
$ npm start
...
```

### Docker

A basic dockerfile which builds the app and serves it via nginx is included in the repository

To build the docker image (from root of monorepo):

```bash
docker build  -t caravan:latest -f apps/coordinator/Dockerfile .
```

To run the built docker image:

```bash
docker run -p 8000:80 caravan:latest
```

Caravan should then be accessible at http://localhost:8000/#

## Usage

If you can access the [Caravan Coordinator web
application](https://caravan-bitcoin.github.io/caravan) in your
browser, you are ready to start using Caravan.

Click the _Create_ or _Interact_ links in the navbar to get started.

See our [YouTube
playlist](https://www.youtube.com/playlist?list=PLUM8mrUjWoPRsVGEZ1gTntqPd4xrQZoiH)
for some tutorial videos.

### Keys

Caravan can connect to several different hardware wallets and key
management software.

- [Trezor One](https://shop.trezor.io/product/trezor-one-white) (installing the Trezor Bridge is required to interact with a Trezor device)
- [Trezor Model T](https://shop.trezor.io/product/trezor-model-t) (installing the Trezor Bridge is required to interact with a Trezor device)

- [Ledger Nano S](https://www.ledger.com/products/ledger-nano-s)
- [Ledger Nano X](https://www.ledger.com/products/ledger-nano-x)

- [Coldcard Mk2, Mk3, & Mk4](https://coldcard.com/)

- [Hermit](https://github.com/unchained-capital/hermit)

Caravan also accepts public keys and signatures as text so any wallet
which can export these data can be made to work with Caravan.

### Consensus

By default, Caravan uses a free API provided by
[mempool.space](https://mempool.space) whenever it needs
information about the bitcoin blockchain or to broadcast transactions. Blockstream.info is also available as a fallback
option for a public API.

Mainnet and Testnet are available options for connecting to any of the available
consensus client options. Regtest can be available through an uploaded wallet
configuration file, but only for the private client backend.

### Bitcoind client

You can also ask Caravan to use your own private [bitcoind full
node](https://bitcoin.org/en/full-node).

#### Bitcoind Wallet

In order for Caravan to calculate wallet balances and
construct transactions from available UTXOs, when using
your own bitcoind node, you will need to have a watch-only
wallet available to import your wallet's descriptors to (available since
bitcoin v21).

Bitcoind no longer initializes with a wallet so you will have to create
one manually:

```shell
bitcoin-cli -named createwallet wallet_name="watcher" blank=true disable_private_keys=true load_on_startup=true
```

What does this do:

- `-named` means you can pass named params rather than having to do them in exactly the right order
- `createwallet` this creates our wallet (available since [v22](https://bitcoincore.org/en/doc/22.0.0/rpc/wallet/createwallet/))
- `wallet_name`: the name of the wallet you will use to import your descriptors (multiple descriptors can be imported to the same wallet)
- `blank`: We don't need to initialize this wallet with any key information
- `disable_private_keys` this allows us to import watch-only descriptors (xpubs only, no xprivs)
- `load_on_startup` optionally set this wallet to always load when the node starts up. Wallets need to be manually loaded with `loadwallet` now so this can be handy.

Then in Caravan you will have to use the `Import Addresses` button to have your node start
watching the addresses in your wallet.

##### Multiple Wallets

A node can have multiple wallets loaded at the same time. In such
cases if you don't indicate which wallet you are targeting
with wallet-specific commands then the API call will fail.

As such, Caravan Coordinator and @caravan/clients now support an optional `walletName` configuration. If this is set in your configuration file (also available during wallet creation), then
the calls will make sure to target this wallet. Use the same value as
`wallet_name` from wallet creation above.

#### Importing existing wallets

IMPORTANT: if you're importing a wallet that has prior history into a node that was not
previously watching the addresses and did not have txindex enabled, you will have
to re-index your node (sync all blocks from the beginning checking for relevant history
that the node previously didn't care about) in order to see your balance reflected.

#### Adding CORS Headers

When asking Caravan to use a private bitcoind node, you may run into
[CORS issues](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).
This is because [bitcoin-core](https://github.com/bitcoin/bitcoin/pull/12040)
does not natively support CORS headers. Because of how `caravan` is designed,
CORS headers are essential to protecting the security of your coins and you will
need to add the appropriate headers.

To correct this problem, you must add appropriate access control
headers to your node's HTTP responses. When running Caravan on your
local machine, for example, you may need to set
`Access-Control-Allow-Origin: https://localhost:5137`.

This can be done using a webserver such as
[nginx](https://www.nginx.com) or [Apache](https://httpd.apache.org),
a proxy tool such as [mitmproxy](https://mitmproxy.org), or even just
a script.

A particularly simple way to proxy requests to a private bitcoind node
is to make use of [`nginx`](https://nginx.org/). Instructions to install
and run the program are on its [download page](https://nginx.org/en/download.html).

Explicitly, install `nginx` with

```bash
# MacOS
brew install nginx

# Debian Linux
sudo apt install nginx
```

Copy the server configuration file, `bitcoind.proxy`, to the appropriate location with the following
commands. Note, these commands assume that you are in the base `caravan` directory. An example configuration
file is included with the `caravan` source code called `bitcoind.proxy` which will, by default, enable a mainnet
proxy. The testnet proxy is included, but is commented out.

```bash
# MacOS Intel
mkdir -p /usr/local/etc/nginx/sites-available
cp bitcoind.proxy /usr/local/etc/nginx/sites-available/
ln -s /usr/local/etc/nginx/sites-available/bitcoind.proxy /usr/local/etc/nginx/servers/bitcoind.proxy

# MacOS Silicon
mkdir -p /opt/homebrew/etc/nginx/sites-available
cp bitcoind.proxy /opt/homebrew/etc/nginx/sites-available/
ln -s /opt/homebrew/etc/nginx/sites-available/bitcoind.proxy /opt/homebrew/etc/nginx/servers/bitcoind.proxy

# Debian Linux
sudo mkdir -p /etc/nginx/sites-available
sudo cp bitcoind.proxy /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/bitcoind.proxy /etc/nginx/sites-enabled/bitcoind.proxy
```

Different linux distributions follow different conventions for the `/etc/nginx/` directory structure.
As an example, macOS uses `etc/nginx/servers` and Debian distributions use `/etc/nginx/sites-enabled/`
for the website configuration files. You will need to check the `/etc/nginx/nginx.conf` file to see what
the convention is. This snippet is from a machine using Ubuntu 18.04 LTS. Note the two directories
that are included. Whereas on macOS there is only one `include` directory, `include servers/*;`.

```nginx
http {
  ...
  ##
  # Virtual Host Configs
  ##

  include /etc/nginx/conf.d/*.conf;
  include /etc/nginx/sites-enabled/*;
}
```

[Arch Linux](https://wiki.archlinux.org/index.php/nginx#Configuration) provides more details on how to configure
`nginx` for that distribution. It may be as simple as adding `include /etc/nginx/sites-enabled/*;` in the `http` block
of `/etc/nginx/nginx.conf` and then:

```bash
sudo mkdir -p /etc/nginx/sites-enabled
sudo ln -s /etc/nginx/sites-available/bitcoind.proxy /etc/nginx/sites-enabled/bitcoind.proxy
```

Check that everything is copied correctly, properly configured, and that there are no errors in the syntax:

```bash
$ nginx -t
nginx: the configuration file /usr/local/etc/nginx/nginx.conf syntax is ok
nginx: configuration file /usr/local/etc/nginx/nginx.conf test is successful
```

Start `nginx`

```bash
# MacOS
brew services start nginx
# or if nginx is already running
brew services reload nginx

# Debian Linux
sudo systemctl start nginx
# or if nginx is already running
sudo systemctl restart nginx
```

On macOS, starting the `nginx` daemon will prompt a popup window asking if you want `ngingx`
to allow incoming network connections, which you will want to allow.

Test the different ports where `my_uname` is the user specified in the `bitcoin.conf` line
`rpcauth=my_uname:` (Don't use this username!):

```bash
# Test that bitcoin rpc is functioning correctly
curl --user my_uname --data-binary \
'{"jsonrpc": "1.0", "id":"curltest", "method": "getblockcount", "params": [] }' \
-H 'content-type: text/plain;' http://127.0.0.1:8332
# Test the nginx reverse proxy
curl --user my_uname --data-binary \
'{"jsonrpc": "1.0", "id":"curltest", "method": "getblockcount", "params": [] }' \
-H 'content-type: text/plain;' --resolve bitcoind.localhost:8080:127.0.0.1 http://bitcoind.localhost:8080
```

Both tests should result in the same output with the current block height, e.g.

```json
{ "result": 668255, "error": null, "id": "curltest" }
```

If you are running a bitcoind node on the same machine as Caravan,
on port 8332, and you run `nginx` with the default settings,
you should be able to point Caravan at 'http://bitcoind.localhost:8080'
to communicate with your node. If you have bitcoind running on a different machine,
you will need to adjust the `upstream` block in `bitcoind.proxy` for the correct
network address:port. Don't forget to add the correct `rpcallowip=LOCAL_MACHINE_IP`
to the remote machine's `bitcoin.conf`.

Because the `nginx` configuration depends entirely on what is specified in
the `upstream` block it is STRONGLY recommended to keep `bitcoind` reserved
for the mainnet and `testnet` for the testnet. In this way, `nginx` could be
configured to simultaneously provide a reverse proxy to the mainnet via
'http://bitcoind.localhost:8080' and to the testnet via 'http://testnet.localhost:8080'.

##### mainnet `nginx` template

```nginx
upstream bitcoind {
  server 127.0.0.1:8332;
}

server {
  listen 8080;
  server_name bitcoind.localhost;

  location / {
    ...
    proxy_pass http://bitcoind;
    ...
  }
}
```

##### testnet `nginx` template

```nginx
upstream testnet {
  server 127.0.0.1:18332;
}

server {
  listen 8080;
  server_name testnet.localhost;

  location / {
    ...
    proxy_pass http://testnet;
    ...
  }
}
```

#### Adding CORS Headers (Deprecated)

A particularly simple way to proxy requests to a private bitcoind node
is to make use of the [`corsproxy`](https://www.npmjs.com/package/corsproxy)
npm module. Instructions to install and run the module are on its
[home page](https://www.npmjs.com/package/corsproxy). `corsproxy` has not
been updated in a number of years and will require an earlier version of `node`
to function properly.

Explicitly, install `corsproxy` with

```bash
npm install -g corsproxy
```

and then launch corsproxy

```bash
$ corsproxy
[log,info], data: CORS Proxy running at: http://localhost:1337
...
```

If you are running a bitcoind node on the same machine as Caravan,
on port 8332, and you run `corsproxy` with the default settings,
you should be able to point Caravan at 'http://localhost:1337/localhost:8332'
to communicate with your node. A testnet node would be running on a
different port, for example: `http://localhost:1337/localhost:18332`, and you
would need to point Caravan to that URL instead.

Finally, a testnet/regtest node running on a different machine but still on the same
network might be accessible to you via `http://localhost:1337/192.168.0.22:18332`, but
you need to make sure the ports are open and accessible. It should be clear at this
point that if corsproxy is running, paste your node's IP:port on the end of the
`corsproxy` URL: `http://localhost:1337/`

## Contributing

Please see the [`CONTRIBUTING.md`](./CONTRIBUTING.md) and the open [GitHub Issues](https://github.com/caravan-bitcoin/caravan/issues)
