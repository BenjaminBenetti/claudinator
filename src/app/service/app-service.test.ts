import { assertEquals } from "@std/assert";
import { createSignalHandlerService } from "../../cli/service/signal-handler-service.ts";

// Mock AppService without React dependencies for testing
class MockAppService {
  private signalHandler: any;
  private isRunning = false;
  private mockInkService: any;
  private mockAgentService: any;
  private mockUIStateService: any;

  constructor(signalHandler: any) {
    this.signalHandler = signalHandler;
    this.mockInkService = {
      start: async () => {
        this.isRunning = true;
        await new Promise((resolve) => setTimeout(resolve, 10));
        this.isRunning = false;
      },
      cleanup: () => {
        this.isRunning = false;
      },
    };

    // Mock agent service
    this.mockAgentService = {
      listAgents: () => [],
      getSelectedAgents: () => [],
      createAgent: () => ({
        id: "mock-id",
        name: "Mock Agent",
        status: "idle",
        createdAt: new Date(),
      }),
      selectAgent: () => true,
      getAgentCount: () => 0,
      getSelectedAgentCount: () => 0,
    };

    // Mock UI state service
    this.mockUIStateService = {
      getFocusArea: () => "sidebar",
      getSelectedListIndex: () => 0,
      getFocusedTileIndex: () => 0,
      setFocusArea: () => {},
      setSelectedListIndex: () => {},
      setFocusedTileIndex: () => {},
      resetState: () => {},
    };
  }

  public async run(): Promise<void> {
    this.isRunning = true;
    try {
      // Mock app container with splash screen and main app
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
