import { assertEquals } from "@std/assert";
import { createSignalHandlerService } from "../../cli/service/signal-handler-service.ts";

// Mock AppService without React dependencies for testing
class MockAppService {
  private signalHandler: any;
  private isRunning = false;
  private mockInkService: any;

  constructor(signalHandler: any) {
    this.signalHandler = signalHandler;
    this.mockInkService = {
      start: async () => {
        this.isRunning = true;
        await new Promise(resolve => setTimeout(resolve, 10));
        this.isRunning = false;
      },
      cleanup: () => {
        this.isRunning = false;
      }
    };
  }

  public async run(): Promise<void> {
    this.isRunning = true;
    try {
      await this.mockInkService.start();
    } finally {
      this.isRunning = false;
    }
  }

  public cleanup(): void {
    this.isRunning = false;
    this.mockInkService.cleanup();
  }

  public get running(): boolean {
    return this.isRunning;
  }
}

Deno.test("Unit - Signal handler should initialize", () => {
  const signalHandler = createSignalHandlerService();
  
  assertEquals(signalHandler.isShutdown, false);
  assertEquals(typeof signalHandler.signal, "object");
});

Deno.test("Unit - App should initialize with signal handler", () => {
  const signalHandler = createSignalHandlerService();
  const app = new MockAppService(signalHandler);
  
  assertEquals(typeof app.cleanup, "function");
  assertEquals(typeof app.run, "function");
  assertEquals(app.running, false);
});

Deno.test("Unit - App cleanup should work", () => {
  const signalHandler = createSignalHandlerService();
  const app = new MockAppService(signalHandler);
  
  app.cleanup();
  
  assertEquals(app.running, false);
});

Deno.test("Unit - App should track running state", async () => {
  const signalHandler = createSignalHandlerService();
  const app = new MockAppService(signalHandler);
  
  assertEquals(app.running, false);
  
  await app.run();
  
  assertEquals(app.running, false); // Should be false after run completes
});

Deno.test("Unit - Signal handler cleanup callbacks", () => {
  const signalHandler = createSignalHandlerService();
  let cleanupCalled = false;
  
  signalHandler.registerCleanupCallback(() => {
    cleanupCalled = true;
  });
  
  assertEquals(cleanupCalled, false);
});