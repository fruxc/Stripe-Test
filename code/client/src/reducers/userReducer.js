import Types from "../constants/userConstants";
import { S, F } from "../utils/actions";

const INITIAL_STATE = {
  currentUsers: { data: [], status: null },
  stripeKey: { data: "", status: null },
};

export default (state = INITIAL_STATE, action = {}) => {
  switch (action.type) {
    case Types.ADD_USER:
      return {
        ...state,
      };
    case S(Types.ADD_USER):
      const d = state.currentUsers.data;
      d.push(action.payload);
      return {
        ...state,
        currentUsers: { data: d, status: 200 },
      };
    case F(Types.ADD_USER):
      return {
        ...state,
        currentUsers: { data: [], status: null },
      };
    case Types.GET_KEY:
      return {
        ...state,
        stripeKey: { data: "", status: null },
      };
    case S(Types.GET_KEY):
      return {
        ...state,
        stripeKey: { data: action.payload, status: 200 },
      };
    case F(Types.GET_KEY):
      return {
        ...state,
        stripeKey: { data: "", status: null },
      };
    case Types.MODIFY_USER:
      return {
        ...state,
      };
    case S(Types.MODIFY_USER):
      return {
        ...state,
        currentUsers: { data: action.payload, status: 200 },
      };
    case F(Types.MODIFY_USER):
      return {
        ...state,
      };
    default:
      return state;
  }
};
