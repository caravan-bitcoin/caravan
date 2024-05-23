export const START_TEST_SUITE_RUN = "START_TEST_SUITE_RUN";
export const SET_CURRENT_TEST_RUN = "SET_CURRENT_TEST_RUN";

type StartTestSuiteRunAction = {
  type: typeof START_TEST_SUITE_RUN;
};

type SetCurrentTestRunAction = {
  type: typeof SET_CURRENT_TEST_RUN;
  value: number;
};

export type TestSuiteRunActionTypes =
  | StartTestSuiteRunAction
  | SetCurrentTestRunAction;

export function startTestSuiteRun(): StartTestSuiteRunAction {
  return {
    type: START_TEST_SUITE_RUN,
  };
}

export function setCurrentTestRun(runIndex: number): SetCurrentTestRunAction {
  return {
    type: SET_CURRENT_TEST_RUN,
    value: runIndex,
  };
}
