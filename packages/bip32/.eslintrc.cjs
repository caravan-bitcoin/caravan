module.exports = {
  extends: ["@caravan/eslint-config/library.js"],
  plugins: ["import"],
  rules: {
    "@typescript-eslint/no-duplicate-enum-values": "warn",
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "sort-imports": [
      "error",
      {
        allowSeparatedGroups: true,
        ignoreDeclarationSort: true,
      },
    ],
  },
};
