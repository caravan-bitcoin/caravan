"use strict";

require("core-js/modules/es6.array.index-of");
require("core-js/modules/es6.object.define-properties");
require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/es6.array.for-each");
require("core-js/modules/es6.array.filter");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.object.keys");
require("core-js/modules/es6.object.define-property");
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  VERSION: true,
  MULTISIG_ROOT: true,
  DIRECT_KEYSTORES: true,
  INDIRECT_KEYSTORES: true,
  KEYSTORES: true,
  GetMetadata: true,
  ExportPublicKey: true,
  SignMessage: true,
  ExportExtendedPublicKey: true,
  SignMultisigTransaction: true,
  ConfirmMultisigAddress: true,
  RegisterWalletPolicy: true,
  ConfigAdapter: true
};
exports.ConfigAdapter = ConfigAdapter;
exports.ConfirmMultisigAddress = ConfirmMultisigAddress;
exports.DIRECT_KEYSTORES = void 0;
exports.ExportExtendedPublicKey = ExportExtendedPublicKey;
exports.ExportPublicKey = ExportPublicKey;
exports.GetMetadata = GetMetadata;
exports.MULTISIG_ROOT = exports.KEYSTORES = exports.INDIRECT_KEYSTORES = void 0;
exports.RegisterWalletPolicy = RegisterWalletPolicy;
exports.SignMessage = SignMessage;
exports.SignMultisigTransaction = SignMultisigTransaction;
exports.VERSION = void 0;
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.function.name");
var _package = require("../package.json");
var _interaction = require("./interaction");
Object.keys(_interaction).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _interaction[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _interaction[key];
    }
  });
});
var _coldcard = require("./coldcard");
Object.keys(_coldcard).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _coldcard[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _coldcard[key];
    }
  });
});
var _custom = require("./custom");
Object.keys(_custom).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _custom[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _custom[key];
    }
  });
});
var _hermit = require("./hermit");
Object.keys(_hermit).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _hermit[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _hermit[key];
    }
  });
});
var _ledger = require("./ledger");
Object.keys(_ledger).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _ledger[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _ledger[key];
    }
  });
});
var _trezor = require("./trezor");
Object.keys(_trezor).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _trezor[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _trezor[key];
    }
  });
});
var _policy = require("./policy");
Object.keys(_policy).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _policy[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _policy[key];
    }
  });
});
var _unchainedBitcoin = require("unchained-bitcoin");
var _bcur = require("./bcur");
Object.keys(_bcur).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _bcur[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _bcur[key];
    }
  });
});
var _excluded = ["keystore", "policyHmac", "verify"];
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }
function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
/**
 * Current unchained-wallets version.
 */
var VERSION = _package.version;
exports.VERSION = VERSION;
var MULTISIG_ROOT = "m/45'";

/**
 * Keystores which support direct interactions.
 */
exports.MULTISIG_ROOT = MULTISIG_ROOT;
var DIRECT_KEYSTORES = {
  TREZOR: _trezor.TREZOR,
  LEDGER: _ledger.LEDGER,
  LEDGER_V2: _ledger.LEDGER_V2
};

/**
 * Keystores which support indirect interactions.
 */
exports.DIRECT_KEYSTORES = DIRECT_KEYSTORES;
var INDIRECT_KEYSTORES = {
  HERMIT: _hermit.HERMIT,
  COLDCARD: _coldcard.COLDCARD,
  CUSTOM: _custom.CUSTOM
};

/**
 * Supported keystores.
 */
exports.INDIRECT_KEYSTORES = INDIRECT_KEYSTORES;
var KEYSTORES = _objectSpread(_objectSpread({}, DIRECT_KEYSTORES), INDIRECT_KEYSTORES);
exports.KEYSTORES = KEYSTORES;
/**
 * Return an interaction class for obtaining metadata from the given
 * `keystore`.
 *
 * **Supported keystores:** Trezor, Ledger
 *
 * @example
 * import {GetMetadata, TREZOR} from "unchained-wallets";
 * // Works similarly for Ledger.
 * const interaction = GetMetadata({keystore: TREZOR});
 * const metadata = await interaction.run();
 */
function GetMetadata(_ref) {
  var keystore = _ref.keystore;
  switch (keystore) {
    case _ledger.LEDGER:
      return new _ledger.LedgerGetMetadata();
    case _trezor.TREZOR:
      return new _trezor.TrezorGetMetadata();
    default:
      return new _interaction.UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore does not return a version."
      });
  }
}

/**
 * Return an interaction class for exporting a public key from the
 * given `keystore` for the given `bip32Path` and `network`.
 *
 * **Supported keystores:** Trezor, Ledger, Hermit
 *
 * @example
 * import {MAINNET} from "unchained-bitcoin";
 * import {ExportPublicKey, TREZOR, HERMIT} from "unchained-wallets";
 * // Works similarly for Ledger
 * const interaction = ExportPublicKey({keystore: TREZOR, network: MAINNET, bip32Path: "m/45'/0'/0'/0/0"});
 * const publicKey = await interaction.run();
 */
function ExportPublicKey(_ref2) {
  var keystore = _ref2.keystore,
    network = _ref2.network,
    bip32Path = _ref2.bip32Path,
    includeXFP = _ref2.includeXFP;
  switch (keystore) {
    case _coldcard.COLDCARD:
      return new _coldcard.ColdcardExportPublicKey({
        network: network,
        bip32Path: bip32Path
      });
    case _ledger.LEDGER:
      return new _ledger.LedgerExportPublicKey({
        bip32Path: bip32Path,
        includeXFP: includeXFP
      });
    case _trezor.TREZOR:
      return new _trezor.TrezorExportPublicKey({
        network: network,
        bip32Path: bip32Path,
        includeXFP: includeXFP
      });
    default:
      return new _interaction.UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when exporting public keys."
      });
  }
}

/**
 * Return an interaction class for signing a message by the given `keystore`
 * for the given `bip32Path`.
 *
 * **Supported keystores:** Ledger, Trezor
 */
function SignMessage(_ref3) {
  var keystore = _ref3.keystore,
    bip32Path = _ref3.bip32Path,
    message = _ref3.message;
  switch (keystore) {
    case _ledger.LEDGER:
      return new _ledger.LedgerSignMessage({
        bip32Path: bip32Path,
        message: message
      });
    case _trezor.TREZOR:
      return new _trezor.TrezorSignMessage({
        bip32Path: bip32Path,
        message: message
      });
    default:
      return new _interaction.UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when signing a message."
      });
  }
}

/**
 * Return an interaction class for exporting an extended public key
 * from the given `keystore` for the given `bip32Path` and `network`.
 *
 * **Supported keystores:** Trezor, Hermit, Ledger
 *
 * @example
 * import {MAINNET} from "unchained-bitcoin";
 * import {ExportExtendedPublicKey, TREZOR, HERMIT} from "unchained-wallets";
 * // Works similarly for Ledger
 * const interaction = ExportExtendedPublicKey({keystore: TREZOR, network: MAINNET, bip32Path: "m/45'/0'/0'/0/0"});
 * const xpub = await interaction.run();
 */
function ExportExtendedPublicKey(_ref4) {
  var keystore = _ref4.keystore,
    network = _ref4.network,
    bip32Path = _ref4.bip32Path,
    includeXFP = _ref4.includeXFP;
  switch (keystore) {
    case _coldcard.COLDCARD:
      return new _coldcard.ColdcardExportExtendedPublicKey({
        bip32Path: bip32Path,
        network: network
      });
    case _custom.CUSTOM:
      return new _custom.CustomExportExtendedPublicKey({
        bip32Path: bip32Path,
        network: network
      });
    case _hermit.HERMIT:
      return new _hermit.HermitExportExtendedPublicKey({
        bip32Path: bip32Path
      });
    case _ledger.LEDGER:
      return new _ledger.LedgerExportExtendedPublicKey({
        bip32Path: bip32Path,
        network: network,
        includeXFP: includeXFP
      });
    case _trezor.TREZOR:
      return new _trezor.TrezorExportExtendedPublicKey({
        bip32Path: bip32Path,
        network: network,
        includeXFP: includeXFP
      });
    default:
      return new _interaction.UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when exporting extended public keys."
      });
  }
}

/**
 * Return an interaction class for signing a multisig transaction with
 * the given `keystore`.
 *
 * The inputs are objects which have `txid`, `index`, and a `multisig`
 * object, the last which is a `Multisig` object from
 * `unchained-bitcoin`.
 *
 * The outputs are objects which have `address` and `amountSats` (an
 * integer).
 *
 * `bip32Paths` is an array of BIP32 paths for the public keys on this
 * device, one for each input.
 *
 * **Supported keystores:** Trezor, Ledger, Hermit
 *
 * @example
 * import {
 *   generateMultisigFromHex, TESTNET, P2SH,
 * } from "unchained-bitcoin";
 * import {SignMultisigTransaction, TREZOR} from "unchained-wallets";
 * const redeemScript = "5...ae";
 * const inputs = [
 *   {
 *     txid: "8d276c76b3550b145e44d35c5833bae175e0351b4a5c57dc1740387e78f57b11",
 *     index: 1,
 *     multisig: generateMultisigFromHex(TESTNET, P2SH, redeemScript),
 *     amountSats: '1234000'
 *   },
 *   // other inputs...
 * ];
 * const outputs = [
 *   {
 *     amountSats: '1299659',
 *     address: "2NGHod7V2TAAXC1iUdNmc6R8UUd4TVTuBmp"
 *   },
 *   // other outputs...
 * ];
 * const interaction = SignMultisigTransaction({
 *   keystore: TREZOR, // works the same for Ledger
 *   network: TESTNET,
 *   inputs,
 *   outputs,
 *   bip32Paths: ["m/45'/0'/0'/0", // add more, 1 per input],
 * });
 * const signature = await interaction.run();
 * console.log(signatures);
 * // ["ababab...", // 1 per input]
 *
 */

function SignMultisigTransaction(_ref5) {
  var keystore = _ref5.keystore,
    network = _ref5.network,
    inputs = _ref5.inputs,
    outputs = _ref5.outputs,
    bip32Paths = _ref5.bip32Paths,
    psbt = _ref5.psbt,
    keyDetails = _ref5.keyDetails,
    _ref5$returnSignature = _ref5.returnSignatureArray,
    returnSignatureArray = _ref5$returnSignature === void 0 ? false : _ref5$returnSignature,
    walletConfig = _ref5.walletConfig,
    policyHmac = _ref5.policyHmac,
    progressCallback = _ref5.progressCallback;
  switch (keystore) {
    case _coldcard.COLDCARD:
      return new _coldcard.ColdcardSignMultisigTransaction({
        network: network,
        inputs: inputs,
        outputs: outputs,
        bip32Paths: bip32Paths,
        psbt: psbt
      });
    case _custom.CUSTOM:
      return new _custom.CustomSignMultisigTransaction({
        network: network,
        inputs: inputs,
        outputs: outputs,
        bip32Paths: bip32Paths,
        psbt: psbt
      });
    case _hermit.HERMIT:
      return new _hermit.HermitSignMultisigTransaction({
        psbt: psbt,
        returnSignatureArray: returnSignatureArray
      });
    case _ledger.LEDGER:
      {
        var _psbt = psbt;
        if (!_psbt) _psbt = (0, _unchainedBitcoin.unsignedMultisigPSBT)(network, inputs, outputs).data.toBase64();
        return new _ledger.LedgerSignMultisigTransaction({
          network: network,
          inputs: inputs,
          outputs: outputs,
          bip32Paths: bip32Paths,
          psbt: _psbt,
          keyDetails: keyDetails,
          returnSignatureArray: returnSignatureArray,
          v2Options: _objectSpread(_objectSpread({}, walletConfig), {}, {
            policyHmac: policyHmac,
            psbt: _psbt,
            progressCallback: progressCallback,
            returnSignatureArray: returnSignatureArray
          })
        });
      }
    case _ledger.LEDGER_V2:
      // if we can know for sure which version of the app
      // we're going to be interacting with then we
      // can return this interaction explicitly without
      // waiting for catching failures and using fallbacks
      // as in the above with v2Options
      return new _ledger.LedgerV2SignMultisigTransaction(_objectSpread(_objectSpread({}, walletConfig), {}, {
        policyHmac: policyHmac,
        psbt: psbt,
        progressCallback: progressCallback,
        returnSignatureArray: returnSignatureArray
      }));
    case _trezor.TREZOR:
      return new _trezor.TrezorSignMultisigTransaction({
        network: network,
        inputs: inputs,
        outputs: outputs,
        bip32Paths: bip32Paths,
        psbt: psbt,
        keyDetails: keyDetails,
        returnSignatureArray: returnSignatureArray
      });
    default:
      return new _interaction.UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when signing multisig transactions."
      });
  }
}

/**
 * Return an interaction class for confirming a multisig address with
 * the given `keystore`.
 *
 * The `multisig` parameter is a `Multisig` object from
 * `unchained-bitcoin`.
 *
 * `bip32Path` is the BIP32 path for the publiic key in the address on
 * this device.
 *
 * `publicKey` optional, is the public key expected to be at `bip32Path`.
 *
 * **Supported keystores:** Trezor, Ledger
 *
 * @example
 * import {
 *   generateMultisigFromHex, TESTNET, P2SH,
 * } from "unchained-bitcoin";
 * import {
 *   ConfirmMultisigAddress,
 *   multisigPublicKeys,
 *   trezorPublicKey,
 *   TREZOR} from "unchained-wallets";
 * const redeemScript = "5...ae";
 * const multisig = generateMultisigFromHex(TESTNET, P2SH, redeemScript);
 * const interaction = ConfirmMultisigAddress({
 *   keystore: TREZOR,
 *   network: TESTNET,
 *   multisig,
 *   bip32Path: "m/45'/1'/0'/0/0",
 * });
 * await interaction.run();
 *
 * With publicKey:
 * const redeemScript = "5...ae";
 * const multisig = generateMultisigFromHex(TESTNET, P2SH, redeemScript);
 * const publicKey = trezorPublicKey(multisigPublicKeys(this.multisig)[2])
 * const interaction = ConfirmMultisigAddress({
 *   keystore: TREZOR,
 *   publicKey,
 *   network: TESTNET,
 *   multisig,
 *   bip32Path: "m/45'/1'/0'/0/0",
 * });
 * await interaction.run();
 *
 *
 */
function ConfirmMultisigAddress(_ref6) {
  var keystore = _ref6.keystore,
    network = _ref6.network,
    bip32Path = _ref6.bip32Path,
    multisig = _ref6.multisig,
    publicKey = _ref6.publicKey,
    name = _ref6.name,
    policyHmac = _ref6.policyHmac,
    walletConfig = _ref6.walletConfig;
  switch (keystore) {
    case _trezor.TREZOR:
      return new _trezor.TrezorConfirmMultisigAddress({
        network: network,
        bip32Path: bip32Path,
        multisig: multisig,
        publicKey: publicKey
      });
    case _ledger.LEDGER:
      {
        // TODO: clean this up. The reason for this is that
        // we're expecting this malleable object `multisig` that
        // gets passed in but really these interactions should
        // just get a braid or something derived from it.
        var braidDetails = JSON.parse(multisig.braidDetails);
        var _walletConfig = walletConfig || (0, _policy.braidDetailsToWalletConfig)(braidDetails);
        return new _ledger.LedgerConfirmMultisigAddress(_objectSpread(_objectSpread({
          // this is for the name of the wallet the address being confirmed is from
          name: name
        }, _walletConfig), {}, {
          expected: multisig.address,
          bip32Path: bip32Path,
          policyHmac: policyHmac
        }));
      }
    default:
      return new _interaction.UnsupportedInteraction({
        code: _interaction.UNSUPPORTED,
        text: "This keystore is not supported when confirming multisig addresses."
      });
  }
}

/**
 * Return a class for registering a wallet policy.
 * **Supported keystores:** Ledger
 */
// TODO: superfluous with the ConfigAdapter?
// This name sounds better, but ConfigAdapter can cover Coldcard too
function RegisterWalletPolicy(_ref7) {
  var keystore = _ref7.keystore,
    policyHmac = _ref7.policyHmac,
    _ref7$verify = _ref7.verify,
    verify = _ref7$verify === void 0 ? false : _ref7$verify,
    walletConfig = _objectWithoutProperties(_ref7, _excluded);
  switch (keystore) {
    case _ledger.LEDGER:
      return new _ledger.LedgerRegisterWalletPolicy(_objectSpread(_objectSpread({}, walletConfig), {}, {
        policyHmac: policyHmac,
        verify: verify
      }));
    default:
      return new _interaction.UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when translating external spend configuration files."
      });
  }
}

/**
 * Return a class for creating a multisig config file for a
 * given keystore or coordinator.
 */
function ConfigAdapter(_ref8) {
  var KEYSTORE = _ref8.KEYSTORE,
    jsonConfig = _ref8.jsonConfig,
    policyHmac = _ref8.policyHmac;
  switch (KEYSTORE) {
    case _coldcard.COLDCARD:
      return new _coldcard.ColdcardMultisigWalletConfig({
        jsonConfig: jsonConfig
      });
    case _ledger.LEDGER:
      {
        var walletConfig;
        if (typeof jsonConfig === "string") {
          walletConfig = JSON.parse(jsonConfig);
        } else {
          walletConfig = jsonConfig;
        }
        return new _ledger.LedgerRegisterWalletPolicy(_objectSpread(_objectSpread({}, walletConfig), {}, {
          policyHmac: policyHmac
        }));
      }
    default:
      return new _interaction.UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when translating external spend configuration files."
      });
  }
}