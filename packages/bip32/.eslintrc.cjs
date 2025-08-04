module.exports = {
  extends: ["@caravan/eslint-config/library.js"],
  plugins: ["import"],
  rules: {
    "@typescript-eslint/no-duplicate-enum-values": "warn",
  },
};
