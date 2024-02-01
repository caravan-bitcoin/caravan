"use strict";

require("core-js/modules/es6.object.define-property");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sha256Hash = exports.compose3 = void 0;
var _sha = _interopRequireDefault(require("sha.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
var sha256Hash = function sha256Hash(data) {
  return (0, _sha["default"])('sha256').update(data).digest();
};
exports.sha256Hash = sha256Hash;
var compose3 = function compose3(f, g, h) {
  return function (x) {
    return f(g(h(x)));
  };
};
exports.compose3 = compose3;