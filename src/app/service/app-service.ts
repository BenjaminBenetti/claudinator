import { SignalHandler } from "../../cli/service/signal-handler-service.ts";

export class AppService {
  // =========================================================================
  // Private Properties
  // =========================================================================
  
  private signalHandler: SignalHandler;
  private isRunning = false;

  // =========================================================================
  // Constructor
  // =========================================================================

  constructor(signalHandler: SignalHandler) {
    this.signalHandler = signalHandler;
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  public async run(): Promise<void> {
    this.isRunning = true;
    
    while (this.isRunning && !this.signalHandler.isShutdown) {
      try {
        console.log("Hello World");
        
        await this.sleep(1000);
      } catch (error) {
        if (this.signalHandler.isShutdown) {
          break;
        }
        console.error("Error in application loop:", error);
        break;
      }
    }
  }

  public cleanup(): void {
    this.isRunning = false;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve();
      }, ms);

      this.signalHandler.signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        resolve();
      });
    });
  }
}

export function createAppService(signalHandler: SignalHandler): AppService {
  return new AppService(signalHandler);
}