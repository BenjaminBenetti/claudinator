import {
  parseCliArgs,
  showHelp,
  showVersion,
} from "../utils/args-parser-utils.ts";
import {
  createSignalHandlerService,
  SignalHandler,
} from "./signal-handler-service.ts";
import { createAppService } from "../../app/service/app-service.ts";

export class CliRunnerService {
  // =========================================================================
  // Private Properties
  // =========================================================================

  private signalHandler: SignalHandler;

  // =========================================================================
  // Constructor
  // =========================================================================

  constructor() {
    this.signalHandler = createSignalHandlerService();
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  public async run(args: string[]): Promise<number> {
    try {
      this.signalHandler.setupSignalHandlers();

      const cliArgs = parseCliArgs(args);

      if (cliArgs.help) {
        showHelp();
        return 0;
      }

      if (cliArgs.version) {
        showVersion();
        return 0;
      }

      const app = createAppService(this.signalHandler);

      this.signalHandler.registerCleanupCallback(() => {
        app.cleanup();
      });

      await app.run();

      return 0;
    } catch (error) {
      console.error("Error running CLI:", error);
      return 1;
    }
  }
}

export function createCliRunnerService(): CliRunnerService {
  return new CliRunnerService();
}
