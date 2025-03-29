import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  testEnvironment: "jsdom",
  transform: {
    "\\.[jt]sx?$": "babel-jest",
  },
  transformIgnorePatterns: ["^.+\\.module\\.(css|sass|scss)$"],
  moduleNameMapper: {
    "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
    "^utils/(.*)$": "<rootDir>/src/utils/$1",
    "^components/(.*)$": "<rootDir>/src/components/$1",
    "^actions/(.*)$": "<rootDir>/src/actions/$1",
    "^reducers/(.*)$": "<rootDir>/src/reducers/$1",
    "^selectors/(.*)$": "<rootDir>/src/selectors/$1",
    "^proptypes/(.*)$": "<rootDir>/src/proptypes/$1",
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
  testPathIgnorePatterns: [
    "/node_modules/",
    "/src/tests-vitest/", // Ignore Vitest test files
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/tests/**/*",
    "!src/tests-vitest/**/*", // Exclude Vitest test files from coverage
  ],
};

export default config;
