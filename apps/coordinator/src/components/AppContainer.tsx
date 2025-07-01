import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { createBrowserHistory } from "history";
import App from "./App";

const AppContainer = () => {
  const dispatch = useDispatch();
  const history = createBrowserHistory();

  useEffect(() => {
    const unlisten = history.listen(() => {
      dispatch({ type: "RESET_APP_STATE" });
    });
    return () => {
      unlisten();
    };
  }, [dispatch, history]);

  return <App />;
};

export default AppContainer;