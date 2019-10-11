import { Store, AnyAction, Dispatch as ReduxDispatch, Middleware, MiddlewareAPI } from "redux";
import chalk from "chalk";
import { cloneDeep } from "lodash";
import { sequentialise } from "./sequentialiser";

export type Sequence = AnyAction[];

type EntryPoints = Record<string, Sequence>;

export type PageModel = Object;

export type Enhancer<Dispatch, State, Application extends PageModel> = (
  dispatch: Dispatch,
  state: State
) => Application;

interface GetTesterArguments<State, E extends EntryPoints, Dispatch, Application extends PageModel> {
  getStore: (...additionalMiddlewares: Middleware[]) => Store<State>;
  entryPoints: E;
  enhancer: Enhancer<Dispatch, State, Application>;
}

type Logger = (s: string) => void;

export interface ConfigurationHandlers {
  debug: {
    logActions(logger?: Logger): void;
    logState(logger?: Logger): void;
  };
}

export interface GivenHandlers<E extends EntryPoints, Application> {
  enter: (sequence: keyof E) => void;
  application: Application;
}

export interface WhenHandlers<Application> {
  application: Application;
}

export interface ThenHandlers<Application> {
  application: Application;
  actions: AnyAction[];
}

export const noop = () => {
  return;
};

const defaultActionLogger: Logger = (s: string) => console.log(chalk.black.bgWhite.bold(" ACTION "), "\n", s);

const defaultStateLogger: Logger = (s: string) => console.log(chalk.black.bgWhite.bold(" STATE "), "\n", s);

class Tester<State, E extends EntryPoints, Dispatch, Application extends PageModel> {
  private step: "CONFIGURE" | "GIVEN" | "WHEN" | "THEN" = "CONFIGURE";
  private store: Store<State>;
  private entryPoints: E;
  private enhancer: Enhancer<Dispatch, State, Application>;
  private actions: AnyAction[] = [];
  private actionLogger: Logger = noop;
  private stateLogger: Logger = noop;

  private logActionsMiddleware: Middleware = (_: MiddlewareAPI) => (next: ReduxDispatch) => (action: AnyAction) => {
    if (this.step === "WHEN") {
      this.actions.push(action);
      this.actionLogger(action.toString());
    }
    return next(action);
  };

  constructor({ getStore, entryPoints, enhancer }: GetTesterArguments<State, E, Dispatch, Application>) {
    this.store = getStore(this.logActionsMiddleware);
    this.enhancer = enhancer;
    this.entryPoints = entryPoints;
    this.logState();
  }

  private logState = (): void => {
    this.store.subscribe(() => {
      if (this.step === "WHEN") {
        this.stateLogger(JSON.stringify(this.store.getState()).toString());
      }
    });
  };

  private playSequence = (sequence: keyof E): void => {
    this.entryPoints[sequence].forEach((action: AnyAction) => {
      this.store.dispatch(action);
    });
  };

  public configure = (callback: (helpers: ConfigurationHandlers) => void): void => {
    const helpers: ConfigurationHandlers = {
      debug: {
        logActions: (logger: Logger = defaultActionLogger) => {
          this.actionLogger = logger;
        },
        logState: (logger: Logger = defaultStateLogger) => {
          this.stateLogger = logger;
        }
      }
    };
    callback(helpers);
  };

  public given = async (callback: (helpers: GivenHandlers<E, Application>) => void | Promise<void>): Promise<void> => {
    this.step = "GIVEN";
    const helpers: GivenHandlers<E, Application> = {
      enter: this.playSequence,
      application: this.enhancer((this.store.dispatch as unknown) as Dispatch, {} as State)
    };
    await callback(helpers);
  };

  public when = async (callback: (helpers: WhenHandlers<Application>) => void | Promise<void>): Promise<void> => {
    this.step = "WHEN";
    const helpers: WhenHandlers<Application> = {
      application: this.enhancer((this.store.dispatch as unknown) as Dispatch, {} as State)
    };
    await callback(helpers);
  };

  public then = (callback: (helpers: ThenHandlers<Application>) => void | Promise<void>): void => {
    this.step = "THEN";
    const helpers: ThenHandlers<Application> = {
      application: this.enhancer((this.store.dispatch as unknown) as Dispatch, cloneDeep(this.store.getState())),
      actions: this.actions
    };
    callback(helpers);
  };
}

export function getTester<State, E extends EntryPoints, Dispatch, Application extends PageModel>(
  args: GetTesterArguments<State, E, Dispatch, Application>
) {
  return sequentialise(new Tester(args));
}
