import React from "react";
import ReactDOM from "react-dom";
import { createStore, applyMiddleware, compose } from "redux";
import { Provider } from "react-redux";
import ReduxPromise from "redux-promise";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import thunk from "redux-thunk";

import App from "./components/AppContainer";
import reducers from "./reducers";

/* eslint-disable-next-line no-underscore-dangle */
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(
  reducers,
  composeEnhancers(applyMiddleware(ReduxPromise, thunk)),
);

// Create a query client with optimized defaults for in-memory caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * This is the RQ default, but let's make it explicit.
       *
       * Queries are immediately considered "stale", meaning if (and only if)
       *
       * - the window is blurred and then refocused, or...
       * - another component renders the same query, or...
       * - the current component unmounts and remounts...
       *
       * then the query will be requested once again, and the stale data updated.
       * */
      staleTime: 0,

      // Another explicitly stated default. See above staleTime note for context.
      refetchOnWindowFocus: true,
    },
  },
});

ReactDOM.render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  </Provider>,
  document.getElementById("app"),
);
