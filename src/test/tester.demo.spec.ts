import { getTester, PageModel, Enhancer } from "../tester";
import { getStore, createIncrementCounterAction } from "./Counter";
import { AppState } from "./Counter/state";
import { Dispatch } from "redux";
import { noop } from "../tester";

const A_COUNTER_WITH_VALUE_SET_TO_2 = [createIncrementCounterAction(), createIncrementCounterAction()];

const entryPoints = {
  A_COUNTER_WITH_VALUE_SET_TO_2
};

interface Application extends PageModel {
  incrementCounter(): void;
  expectCounterToEqual(n: number): void;
}

const enhancer: Enhancer<Dispatch, AppState, Application> = (dispatch: Dispatch, state: AppState) => {
  function incrementCounter(): void {
    dispatch(createIncrementCounterAction());
  }
  function expectCounterToEqual(n: number): void {
    expect(state.counter).toEqual(n);
  }
  return {
    incrementCounter,
    expectCounterToEqual
  };
};

it("Should allow testing the Counter application", done => {
  const t = getTester<AppState, typeof entryPoints, Dispatch, Application>({
    getStore,
    entryPoints,
    enhancer
  });

  t.given(({ enter }) => enter("A_COUNTER_WITH_VALUE_SET_TO_2"))
    .when(({ application }) => application.incrementCounter())
    .then(({ application }) => application.expectCounterToEqual(3))
    .finally(done);
});

it("Should allow configuration", done => {
  const t = getTester<AppState, typeof entryPoints, Dispatch, Application>({
    getStore,
    entryPoints,
    enhancer
  });

  t.configure(({ debug }) => debug.logActions(console.log))
    .and(({ debug }) => debug.logState(console.log))
    .given(({ enter }) => enter("A_COUNTER_WITH_VALUE_SET_TO_2"))
    .when(({ application }) => application.incrementCounter())
    .then(({ application }) => application.expectCounterToEqual(3))
    .finally(done);
});

it("Should allow skipping steps", done => {
  const t = getTester<AppState, typeof entryPoints, Dispatch, Application>({
    getStore,
    entryPoints,
    enhancer
  });

  t.given(({ enter }) => enter("A_COUNTER_WITH_VALUE_SET_TO_2"))
    .when(noop)
    .then(({ application }) => application.expectCounterToEqual(2))
    .finally(done);
});
