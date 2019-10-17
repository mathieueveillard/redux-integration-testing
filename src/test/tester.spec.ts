import { getTester, noop, PageModel, Enhancer } from "../tester";
import { getStore, createIncrementCounterAction } from "./Counter";
import { AppState } from "./Counter/state";
import { Dispatch } from "redux";

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

describe("Test of getTester()", () => {
  it("Should allow sequentiality", done => {
    const t = getTester<AppState, typeof entryPoints, Dispatch, Application>({
      getStore,
      entryPoints,
      enhancer
    });

    t.configure(noop)
      .and(noop)
      .and(noop)
      .given(noop)
      .and(noop)
      .and(noop)
      .when(noop)
      .and(noop)
      .and(noop)
      .then(noop)
      .and(noop)
      .and(noop)
      .finally(done);
  });

  it("Should allow testing an application using a page model", done => {
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

  it("Should allow testing an application asynchronously", done => {
    const asyncEnhancer: Enhancer<Dispatch, AppState, Application> = (dispatch: Dispatch, state: AppState) => {
      async function incrementCounter(): Promise<void> {
        dispatch(createIncrementCounterAction());
        await Promise.resolve();
      }
      async function expectCounterToEqual(n: number): Promise<void> {
        expect(state.counter).toEqual(n);
        await Promise.resolve();
      }
      return {
        incrementCounter,
        expectCounterToEqual
      };
    };

    const t = getTester<AppState, typeof entryPoints, Dispatch, Application>({
      getStore,
      entryPoints,
      enhancer: asyncEnhancer
    });

    t.given(({ enter }) => enter("A_COUNTER_WITH_VALUE_SET_TO_2"))
      .and(({ application }) => application.incrementCounter())
      .when(({ application }) => application.incrementCounter())
      .then(({ application }) => application.expectCounterToEqual(4))
      .finally(done);
  });

  it("Should allow debugging", done => {
    const t = getTester<AppState, typeof entryPoints, Dispatch, Application>({
      getStore,
      entryPoints,
      enhancer
    });

    const actionLogger = jest.fn();
    const stateLogger = jest.fn();

    t.configure(({ debug }) => debug.logActions(actionLogger))
      .and(({ debug }) => debug.logState(stateLogger))
      .given(({ enter }) => enter("A_COUNTER_WITH_VALUE_SET_TO_2"))
      .when(({ application }) => application.incrementCounter())
      .then(() => {
        expect(actionLogger).toHaveBeenCalledTimes(1);
        expect(stateLogger).toHaveBeenCalledTimes(1);
      })
      .finally(done);
  });
});
