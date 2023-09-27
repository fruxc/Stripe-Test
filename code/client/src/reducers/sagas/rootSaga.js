import { all } from "redux-saga/effects";

import {
  getAddUserActionWatcher,
  getStripeKeyWatcher,
  getModifyUserActionWatcher,
} from "../actions/userAction";
/**
 * rootSaga - import all the watcher functions below
 */

export default function* rootSaga() {
  yield all([
    getAddUserActionWatcher(),
    getStripeKeyWatcher(),
    getModifyUserActionWatcher(),
  ]);
}
