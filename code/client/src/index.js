import React from "react";
import ReactDOM from "react-dom";
import App from "./components/App";
import "./i18n";
import * as serviceWorker from "./serviceWorker";
import ErrorBoundary from "./components/ErrorBoundary";
import { bindActionCreators } from "redux";
import { Provider, connect } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./reducers/store/store";
import userSaga from "./reducers/actions/userAction";

require("dotenv").config("./.env");

const mapStoreToProps = (state) => ({ ...state });

const mapDispatchToProps = (dispatch) => {
  const dispatchData = bindActionCreators(
    {
      ...userSaga,
    },
    dispatch
  );
  return {
    ...dispatchData,
  };
};

const NewComp = connect(mapStoreToProps, mapDispatchToProps)(App);

ReactDOM.render(
  <ErrorBoundary>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NewComp />
      </PersistGate>
    </Provider>
    {/* <App /> */}
  </ErrorBoundary>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
