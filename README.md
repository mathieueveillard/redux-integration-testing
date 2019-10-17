# redux-integration-testing

- [Purpose](#purpose)
- [Getting started](#getting-started)
- [Handbook](#handbook)
  - [Using a page model](#using-a-page-model)
  - [Mocking network APIs](#mocking-network-apis)
  - [Working with asynchronous code](#working-with-asynchronous-code)
  - [Debugging](#debugging)
  - [Skipping the when step](#skipping-the-when-step)

## Purpose

`redux-integration-testing` is a framework that hides all the testing boilerplate and allows you to write integration tests for Redux applications in a [Gherkin](<https://en.wikipedia.org/wiki/Cucumber_(software)>) style:

```TypeScript
t.given(({ enter }) => enter("A_COUNTER_WITH_VALUE_SET_TO_2"))
  .when(({ application }) => application.incrementCounter())
  .then(({ application }) => application.expectCounterToEqual(3));
```

Integration tests, as per their name, intend to test that all stereotypes involved in an application's feature coordinate well. Stereotypes include at the very least actions and reducers, but stereotypes originating from middlewares like thunks, epics or sagas may be involved as well.

Integration tests are the missing bridge between unit tests (local scope, run fast) and end-to-end tests (global scope, run slowly). Indeed, they embrace a large scope and run at the speed of the unit tests. Testing an application typically requires to write lots of unit tests, at the stereotype level, a significant number of integration tests, at the feature level, and a few end-to-end tests, which are often treated as "happy paths". All of these tests should drive the development (TDD).

A key difference between integration tests and end-to-end tests is that the later call the browser's DOM API and make real network calls. Instead, integration tests wrap the application and mock the network calls.

`redux-integration-testing` is not a test runner, hence you'll be able to use it with the runner of your choice (Jest, Mocha, Jasmine...) Nor is it an assertion library, so, again, feel free to use the assertion library of your choice (Jest, Chai...)

## Getting started

### Installation

```
npm install redux-integration-testing --save-dev
```

### Usage

First, your application must provide a `getStore` function to be invoked by the Tester with a custom logging middleware:

```TypeScript
import { Middleware, Store, createStore, applyMiddleware } from "redux";
import { reducer as rootReducer } from "./reducer";

export function getStore(...additionalMiddlewares: Middleware[]): Store {
  return createStore(rootReducer, applyMiddleware(...additionalMiddlewares));
}
```

Then

```TypeScript
import { getTester, Sequence, PageModel, Enhancer } from "redux-integration-testing";
import { getStore, createIncrementCounterAction } from "./Counter";
import { AppState } from "./Counter/state";
import { Dispatch } from "redux";

const A_COUNTER_WITH_VALUE_SET_TO_2: Sequence = [
  createIncrementCounterAction(),
  createIncrementCounterAction()
];

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
```

### / ! \ Important / ! \

Internally, `redux-integration-testing` relies on promises, in order to handle asynchronism at the `when` step. That's why you must always call `.finally(done)` at the end, `done` being a callback provided by the test runner.

## Handbook

### Using a page model

A page model is your own application's domain specific language (DSL) for interacting with the application. It helps hidding complexity. A page model is a set of functions that allow you to dispatch actions on the one side, and read the state and make expectations on the other side.

As an example, it allows you to write:

```TypeScript
t.then(({ application }) => application.expectCounterToEqual(3));
```

rather than

```TypeScript
t.then(({ state }) => expect(state.counter).toEqual(3));
```

The examples provided here use objects and functions, but you could of course use classes. It is a common, usefull though not required practice as soon as you need to work with a state. Let's make it perfectly unambiguous: "state" refers here to the state of the page model, not the state of the application under test.

### Mocking network APIs

Mocking APIs is out of the scope of `redux-integration-testing`. An easy way to proceed is to inject APIs at the bootstrap of your application, placing them in the scope of the `getStore` function:

```TypeScript
function makeGetStore(api: Api) {
  return function getStore(...additionalMiddlewares: Middleware[]): Store {
    return createStore(rootReducer, applyMiddleware(middlewareUsingApi(api), ...additionalMiddlewares));
  };
}
```

Then:

```TypeScript
const mockedApi: Api = {
  getSomething: jest.fn().mockResolvedValue({ something: 0 })
}

const t = getTester<AppState, typeof entryPoints, Dispatch, Application>({
  getStore: makeGetStore(mockedApi),
  entryPoints,
  enhancer
});
```

### Working with asynchronous code

`redux-integration-testing` works natively with asynchronous code:

```TypeScript
const asyncEnhancer: Enhancer<Dispatch, AppState, Application> = (dispatch: Dispatch, state: AppState) => {
  async function incrementCounter(): Promise<void> {
    dispatch(createIncrementCounterAction());
    await Promise.resolve(); // Used here to simulate asynchronism
  }
  async function expectCounterToEqual(n: number): Promise<void> {
    expect(state.counter).toEqual(n);
    await Promise.resolve(); // Used here to simulate asynchronism
  }
  return {
    incrementCounter,
    expectCounterToEqual
  };
};

it("Should allow testing an application asynchronously", done => {
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
```

### Debugging

You might configure the Tester to log the state and/or the actions:

```TypeScript
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
```

You'll probably want to use a better logger than `console.log`.

### Skipping the when step

Assuming you're willing to skip the `when` step, you may write the following:

```TypeScript
import { noop } from "../tester";

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
```

This makes sense in particular when asserting the initial state of the application.
