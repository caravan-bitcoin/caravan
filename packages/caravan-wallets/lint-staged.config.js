module.exports = {
  "*.{ts,js}": "eslint --cache --fix",
  "*.{ts,js,css,md}": "prettier --write",
  "src/**/*.ts?(x)": () => "npm run check-types",
};
