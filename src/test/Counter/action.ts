export interface DecrementCounterAction {
  type: "DECREMENT_COUNTER";
}

export function createDecrementCounterAction(): DecrementCounterAction {
  return {
    type: "DECREMENT_COUNTER"
  };
}

export interface IncrementCounterAction {
  type: "INCREMENT_COUNTER";
}

export function createIncrementCounterAction(): IncrementCounterAction {
  return {
    type: "INCREMENT_COUNTER"
  };
}
