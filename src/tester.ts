import { Store, Dispatch as ReduxDispatch, Middleware, MiddlewareAPI } from "redux";
import chalk from "chalk";
import { cloneDeep } from "lodash";
import { sequentialise } from "./sequentialiser";

export type PageModel = Object;

export type Enhancer<Dispatch, State, Application extends PageModel> = (
  dispatch: Dispatch,
  state: State
) => Application;

interface GetTesterArguments<State, EntryPoints, Dispatch, Application extends PageModel> {
  getStore: (...additionalMiddlewares: Middleware[]) => Store<State> & { dispatch: Dispatch };
  entryPoints: EntryPoints;
  enhancer: Enhancer<Dispatch, State, Application>;
}

type Logger = (s: string) => void;

export interface ConfigurationHandlers {
  debug: {
    logActions(logger?: Logger): void;
    logState(logger?: Logger): void;
  };
}

export interface GivenHandlers<EntryPoints, Application> {
  enter: (sequence: keyof EntryPoints) => void;
  application: Application;
}

export interface WhenHandlers<Application> {
  application: Application;
}

export interface ThenHandlers<Application> {
  application: Application;
  actions: any[];
}

export const noop = () => {
  return;
};

const defaultActionLogger: Logger = (s: string) => console.log(chalk.black.bgWhite.bold(" ACTION "), "\n", s);

const defaultStateLogger: Logger = (s: string) => console.log(chalk.black.bgWhite.bold(" STATE "), "\n", s);

class Tester<State, EntryPoints extends Record<string, any>, Dispatch, Application extends PageModel> {
  private step: "CONFIGURE" | "GIVEN" | "WHEN" | "THEN" = "CONFIGURE";
  private store: Store<State> & { dispatch: Dispatch };
  private entryPoints: EntryPoints;
  private enhancer: Enhancer<Dispatch, State, Application>;
  private actions: any[] = [];
  private actionLogger: Logger = noop;
  private stateLogger: Logger = noop;

  private logActionsMiddleware: Middleware = (_: MiddlewareAPI) => (next: ReduxDispatch) => (action: any) => {
    if (this.step === "WHEN") {
      this.actions.push(action);
      this.actionLogger(action.toString());
    }
    return next(action);
  };

  constructor({ getStore, entryPoints, enhancer }: GetTesterArguments<State, EntryPoints, Dispatch, Application>) {
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

  private playSequence = (sequence: keyof EntryPoints): void => {
    this.entryPoints[sequence].forEach((action: any) => {
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

  public given = async (
    callback: (helpers: GivenHandlers<EntryPoints, Application>) => void | Promise<void>
  ): Promise<void> => {
    this.step = "GIVEN";
    const helpers: GivenHandlers<EntryPoints, Application> = {
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

export function getTester<State, EntryPoints, Dispatch, Application extends PageModel>(
  args: GetTesterArguments<State, EntryPoints, Dispatch, Application>
) {
  return sequentialise(new Tester(args));
}
