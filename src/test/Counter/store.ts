import { Middleware, Store, createStore, applyMiddleware } from "redux";
import { reducer as rootReducer } from "./reducer";

export function getStore(...additionalMiddlewares: Middleware[]): Store {
  return createStore(rootReducer, applyMiddleware(...additionalMiddlewares));
}
