interface Sequentialisable<C, G, W, T> {
  configure(args: C): void;
  given(args: G): void;
  when(args: W): Promise<void>;
  then(args: T): void;
}

export function sequentialise<C, G, W, T>(object: Sequentialisable<C, G, W, T>) {
  return atInitialStep(object);
}

export interface TesterAtInitialStep<C, G, W, T> {
  configure(args: C): TesterAtConfigurationStep<C, G, W, T>;
  given(args: G): TesterAtGivenStep<G, W, T>;
}

function atInitialStep<C, G, W, T>(object: Sequentialisable<C, G, W, T>): TesterAtInitialStep<C, G, W, T> {
  return {
    configure: (args: C) => {
      object.configure(args);
      return atConfigurationStep(object);
    },
    given: (args: G) => {
      object.given(args);
      return atGivenStep(object);
    }
  };
}

export interface TesterAtConfigurationStep<C, G, W, T> {
  and(args: C): TesterAtConfigurationStep<C, G, W, T>;
  given(args: G): TesterAtGivenStep<G, W, T>;
}

function atConfigurationStep<C, G, W, T>(object: Sequentialisable<C, G, W, T>): TesterAtConfigurationStep<C, G, W, T> {
  return {
    and: (args: C) => {
      object.configure(args);
      return atConfigurationStep(object);
    },
    given: (args: G) => {
      object.given(args);
      return atGivenStep(object);
    }
  };
}

export interface TesterAtGivenStep<G, W, T> {
  and(args: G): TesterAtGivenStep<G, W, T>;
  when(args: W): TesterAtWhenStep<W, T>;
}

function atGivenStep<C, G, W, T>(object: Sequentialisable<C, G, W, T>): TesterAtGivenStep<G, W, T> {
  return {
    and: (args: G) => {
      object.given(args);
      return atGivenStep(object);
    },
    when: (args: W) => {
      return atWhenStep(object, object.when(args));
    }
  };
}

export interface TesterAtWhenStep<W, T> {
  and(args: W): TesterAtWhenStep<W, T>;
  then(args: T): TesterAtThenStep<T>;
}

function atWhenStep<C, G, W, T>(object: Sequentialisable<C, G, W, T>, promise: Promise<void>): TesterAtWhenStep<W, T> {
  return {
    and: (args: W) => {
      return atWhenStep(object, promise.then(() => object.when(args)));
    },
    then: (args: T) => {
      return atThenStep(object, promise.then(() => object.then(args)));
    }
  };
}

export interface TesterAtThenStep<T> {
  and(args: T): TesterAtThenStep<T>;
  finally(done: () => void): void;
}

function atThenStep<C, G, W, T>(object: Sequentialisable<C, G, W, T>, promise: Promise<void>): TesterAtThenStep<T> {
  return {
    and: (args: T) => {
      return atThenStep(object, promise.then(() => object.then(args)));
    },
    finally: (done: () => void) => {
      promise.then(done);
    }
  };
}
