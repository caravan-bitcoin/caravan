import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  testEnvironment: "jsdom",
  transform: {
    "\\.[jt]sx?$": "babel-jest",
  },
  testPathIgnorePatterns: ["/e2e/"],
  transformIgnorePatterns: ["^.+\\.module\\.(css|sass|scss)$"],
  moduleNameMapper: {
    "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
    "^utils/(.*)$": "<rootDir>/src/utils/$1",
    "^selectors/(.*)$": "<rootDir>/src/selectors/$1",
    "^clients/(.*)$": "<rootDir>/src/clients/$1",
    "^hooks/(.*)$": "<rootDir>/src/hooks/$1",
  },
  moduleFileExtensions: [
    "web.cjs",
    "js",
    "web.ts",
    "ts",
    "web.tsx",
    "tsx",
    "json",
    "web.cjsx",
    "jsx",
    "node",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

export default config;
