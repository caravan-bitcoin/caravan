module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["./jest.setup.js"],
  moduleNameMapper: {
    "^utils/(.*)$": "<rootDir>/src/utils/$1",
    "^components/(.*)$": "<rootDir>/src/components/$1",
    "^actions/(.*)$": "<rootDir>/src/actions/$1",
    "^reducers/(.*)$": "<rootDir>/src/reducers/$1",
    "^selectors/(.*)$": "<rootDir>/src/selectors/$1",
    "^proptypes/(.*)$": "<rootDir>/src/proptypes/$1",
    "^clients/(.*)$": "<rootDir>/src/clients/$1",
    "^hooks/(.*)$": "<rootDir>/src/hooks/$1",
  },
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