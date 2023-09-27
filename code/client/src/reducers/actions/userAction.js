import { call, put, takeLeading } from "redux-saga/effects";
import types from "../../constants/userConstants";
import { S, F } from "../../utils/actions";
import axios from "axios";

const axiosApiCall = (
  params,
  method = "get",
  url = "/getKey",
  headers = { "Content-Type": "application/json" }
) => {
  console.log("axiosApiCall params >> ", params);
  return axios.request({
    baseURL: "http://localhost:4242", // base url
    headers,
    responseType: "json",
    url, // this url will be appended to base url
    method,
  });
};

export const addUserAction = (params) => {
  // setting data in current state
  console.log("block entered");
  return {
    type: types.ADD_USER,
    payload: params,
  };
};

export const getStripeKeys = () => {
  return {
    type: types.GET_KEY,
    apiFunction: axiosApiCall,
  };
};

export const modifyUserAction = (params) => {
  return {
    type: types.MODIFY_USER,
    payload: params,
  };
};

export function* getAddUserActionWorker(action) {
  try {
    const data = action.payload;
    console.log("response >> ", data);
    if (data) {
      yield put({
        type: S(types.ADD_USER),
        payload: data,
      });
    } else {
      yield put({ type: F(types.ADD_USER), error: "" });
    }
  } catch (error) {
    yield put({ type: F(types.ADD_USER), error });
  }
}
export function* getAddUserActionWatcher() {
  yield takeLeading(types.ADD_USER, getAddUserActionWorker);
}

export function* getStripeKeyWorker(action) {
  try {
    const { data } = yield call(action.apiFunction, {}, "get", "/getKey", {
      "Content-Type": "application/json",
    });
    console.log("response >> ", data);
    if (data) {
      yield put({
        type: S(types.GET_KEY),
        payload: data,
      });
    } else {
      yield put({ type: F(types.GET_KEY), error: "" });
    }
  } catch (error) {
    yield put({ type: F(types.GET_KEY), error });
  }
}
export function* getStripeKeyWatcher() {
  yield takeLeading(types.GET_KEY, getStripeKeyWorker);
}

export function* getModifyUserActionWorker(action) {
  try {
    const data = action.payload;
    console.log("response >> ", data);
    if (data) {
      yield put({
        type: S(types.MODIFY_USER),
        payload: data,
      });
    } else {
      yield put({ type: F(types.MODIFY_USER), error: "" });
    }
  } catch (error) {
    yield put({ type: F(types.MODIFY_USER), error });
  }
}
export function* getModifyUserActionWatcher() {
  yield takeLeading(types.MODIFY_USER, getModifyUserActionWorker);
}

export default {
  addUserAction,
  getAddUserActionWatcher,
  getStripeKeys,
  getStripeKeyWatcher,
  modifyUserAction,
  getModifyUserActionWatcher,
};
