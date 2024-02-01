"use strict";

require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.date.to-string");
require("core-js/modules/es6.object.to-string");
var _interaction = require("./interaction");
var _hermit = require("./hermit");
/**
 * @jest-environment jsdom
 */

function itHasACommandMessage(interaction, command) {
  var message = interaction.messageFor({
    state: _interaction.PENDING,
    level: _interaction.INFO,
    code: "hermit.command"
  });
  it("has a command message with the correct command", function () {
    expect(message).not.toBeNull();
    expect(message.command).toEqual(command);
  });
}
describe("HermitExportExtendedPublicKey", function () {
  var bip32Path = "m/45'/0'/0'";
  var interaction = new _hermit.HermitExportExtendedPublicKey({
    bip32Path: bip32Path
  });
  var xfp = "12345678";
  var descriptorPath = bip32Path.slice(1);
  var xpub = "xpub123";
  itHasACommandMessage(interaction, "display-xpub ".concat(bip32Path));
  var toHex = function toHex(text) {
    return Buffer.from(text, "utf8").toString("hex");
  };
  describe("parse", function () {
    it("throws an error when no descriptor is returned", function () {
      expect(function () {
        interaction.parse(null);
      }).toThrow(/no descriptor/i);
      expect(function () {
        interaction.parse("");
      }).toThrow(/no descriptor/i);
    });
    it("throws an error when a non-hex descriptor is returned", function () {
      expect(function () {
        interaction.parse("zzz");
      }).toThrow(/invalid descriptor/i);
    });
    it("throws an error when the descriptor has an invalid XFP", function () {
      expect(function () {
        interaction.parse(toHex("[".concat(descriptorPath, "]").concat(xpub)));
      }).toThrow(/invalid descriptor/i);
      expect(function () {
        interaction.parse(toHex("[1234567 ".concat(descriptorPath, "]").concat(xpub)));
      }).toThrow(/invalid descriptor/i);
      expect(function () {
        interaction.parse(toHex("[1234567".concat(descriptorPath, "]").concat(xpub)));
      }).toThrow(/invalid descriptor/i);
    });
    it("throws an error when the descriptor has an invalid BIP32 path", function () {
      expect(function () {
        interaction.parse(toHex("[".concat(xfp, "]").concat(xpub)));
      }).toThrow(/invalid descriptor/i);
      expect(function () {
        interaction.parse(toHex("[".concat(xfp, "]/").concat(xpub)));
      }).toThrow(/invalid descriptor/i);
      expect(function () {
        interaction.parse(toHex("[".concat(xfp, "]/'").concat(xpub)));
      }).toThrow(/invalid descriptor/i);
      expect(function () {
        interaction.parse(toHex("[".concat(xfp, "]/'1").concat(xpub)));
      }).toThrow(/invalid descriptor/i);
      expect(function () {
        interaction.parse(toHex("[".concat(xfp, "]/1'/").concat(xpub)));
      }).toThrow(/invalid descriptor/i);
      expect(function () {
        interaction.parse(toHex("[".concat(xfp, "]/1'/'").concat(xpub)));
      }).toThrow(/invalid descriptor/i);
      expect(function () {
        interaction.parse(toHex("[".concat(xfp, "]/a'/'").concat(xpub)));
      }).toThrow(/invalid descriptor/i);
    });
    it("throws an error when the descriptor has an invalid xpub", function () {
      expect(function () {
        interaction.parse(toHex("[".concat(xfp).concat(descriptorPath, "]")));
      }).toThrow(/invalid descriptor/i);
      expect(function () {
        interaction.parse(toHex("[".concat(xfp).concat(descriptorPath, "] ").concat(xpub)));
      }).toThrow(/invalid descriptor/i);
      expect(function () {
        interaction.parse(toHex("[".concat(xfp).concat(descriptorPath, "]_hello")));
      }).toThrow(/invalid descriptor/i);
    });
    it("successfully parses a well-formed descriptor", function () {
      var descriptor = toHex("[".concat(xfp).concat(descriptorPath, "]").concat(xpub));
      expect(interaction.parse(descriptor)).toEqual({
        rootFingerprint: xfp,
        bip32Path: bip32Path,
        xpub: xpub
      });
    });
  });
});
describe("HermitSignMultisigTransaction", function () {
  var unsignedPSBTBase64 = "q83vEjRWeJA=";
  var signedPSBTHex = "abcdef1234567890deadbeef";
  var signedPSBTBase64 = "q83vEjRWeJDerb7v";
  var interaction = new _hermit.HermitSignMultisigTransaction({
    psbt: unsignedPSBTBase64
  });
  itHasACommandMessage(interaction, "sign");
  describe("request", function () {
    it("converts the unsigned PSBT from base64 to hex and UR encodes the parts", function () {
      var parts = interaction.request();
      expect(parts.length > 0);
    });
  });
  describe("parse", function () {
    it("throws an error when no signed PSBT is returned", function () {
      expect(function () {
        interaction.parse(null);
      }).toThrow(/no signature/i);
      expect(function () {
        interaction.parse("");
      }).toThrow(/no signature/i);
    });
    it("converts the PSBT from hex to base64", function () {
      expect(interaction.parse(signedPSBTHex)).toEqual(signedPSBTBase64);
    });
  });
});