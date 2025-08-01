module.exports = {
  root: true,
  extends: ["@caravan/eslint-config/library.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  overrides: [
    {
      files: ["*.js"],
      parserOptions: {
        project: null,
      },
    },
  ],
};
