import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  extensionsToTreatAsEsm: [".ts"],
  verbose: true,

  testEnvironment: "node",
  testPathIgnorePatterns: ["./lib"],
  transformIgnorePatterns: ["/node_modules/(?!uint8array-tools)"],
  transform: {
    "^.+\\.js$": "babel-jest",
    "^.+\\.ts?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  setupFiles: ["<rootDir>/jest.setup.ts"],
};

export default config;
