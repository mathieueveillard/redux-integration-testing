import { AppState, defaultState } from "./state";
import { AnyAction } from "redux";

export function reducer(state: AppState = defaultState, action: AnyAction): AppState {
  switch (action.type) {
    case "DECREMENT_COUNTER":
      return { counter: state.counter - 1 };
    case "INCREMENT_COUNTER":
      return { counter: state.counter + 1 };
    default:
      return state;
  }
}
