module.exports = {
  "*.ts?(x)": () => "npm run check-types",
  "*.{ts,js}": "eslint --cache --fix",
  "*.{ts,js,css,md}": "prettier --write",
};
