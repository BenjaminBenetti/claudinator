export class SignalHandler {
  // =========================================================================
  // Private Properties
  // =========================================================================
  
  private abortController: AbortController;
  private isShuttingDown = false;
  private cleanupCallbacks: (() => void | Promise<void>)[] = [];
  private signalListeners: { signal: string; handler: () => void }[] = [];

  // =========================================================================
  // Constructor
  // =========================================================================

  constructor() {
    this.abortController = new AbortController();
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  public setupSignalHandlers(): void {
    try {
      const sigintHandler = () => this.handleSignal("SIGINT");
      const sigtermHandler = () => this.handleSignal("SIGTERM");
      
      Deno.addSignalListener("SIGINT", sigintHandler);
      Deno.addSignalListener("SIGTERM", sigtermHandler);
      
      this.signalListeners = [
        { signal: "SIGINT", handler: sigintHandler },
        { signal: "SIGTERM", handler: sigtermHandler }
      ];
    } catch (error) {
      console.warn("Signal handling not available in this environment:", error instanceof Error ? error.message : String(error));
    }
  }

  public cleanup(): void {
    try {
      this.signalListeners.forEach(({ signal, handler }) => {
        Deno.removeSignalListener(signal as "SIGINT" | "SIGTERM", handler);
      });
      this.signalListeners = [];
    } catch (error) {
      console.warn("Error cleaning up signal listeners:", error instanceof Error ? error.message : String(error));
    }
  }

  public registerCleanupCallback(callback: () => void | Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  // =========================================================================
  // Public Getters
  // =========================================================================

  public get signal(): AbortSignal {
    return this.abortController.signal;
  }

  public get isShutdown(): boolean {
    return this.isShuttingDown;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private async handleSignal(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      console.log(`\nForce shutdown on second ${signal}...`);
      Deno.exit(1);
    }

    this.isShuttingDown = true;
    console.log(`\nReceived ${signal}, shutting down gracefully...`);

    try {
      this.abortController.abort();
      
      await Promise.all(
        this.cleanupCallbacks.map(async (callback) => {
          try {
            await callback();
          } catch (error) {
            console.error("Error in cleanup callback:", error);
          }
        })
      );

      console.log("Shutdown complete.");
      Deno.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      Deno.exit(1);
    }
  }
}

export function createSignalHandlerService(): SignalHandler {
  return new SignalHandler();
}