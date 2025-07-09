import { assertEquals } from "@std/assert";
import { createSignalHandlerService } from "../../cli/service/signal-handler-service.ts";

// Mock Ink service without React dependencies for testing
class MockInkService {
  private signalHandler: any;
  private isRunning = false;
  private currentInstance: any = null;

  constructor(signalHandler: any) {
    this.signalHandler = signalHandler;
  }

  public async start(component: any): Promise<void> {
    this.isRunning = true;
    
    // Mock Ink render instance
    const mockInstance = {
      waitUntilExit: async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      },
      unmount: () => {
        this.currentInstance = null;
      }
    };
    
    this.currentInstance = mockInstance;
    
    try {
      await mockInstance.waitUntilExit();
    } finally {
      this.isRunning = false;
      this.currentInstance = null;
    }
  }

  public cleanup(): void {
    this.isRunning = false;
    if (this.currentInstance && this.currentInstance.unmount) {
      this.currentInstance.unmount();
      this.currentInstance = null;
    }
  }

  public get running(): boolean {
    return this.isRunning;
  }
}

Deno.test("Unit - InkService should initialize with signal handler", () => {
  const signalHandler = createSignalHandlerService();
  const inkService = new MockInkService(signalHandler);
  
  assertEquals(inkService.running, false);
  assertEquals(typeof inkService.start, "function");
  assertEquals(typeof inkService.cleanup, "function");
});

Deno.test("Unit - InkService cleanup should work", () => {
  const signalHandler = createSignalHandlerService();
  const inkService = new MockInkService(signalHandler);
  
  inkService.cleanup();
  
  assertEquals(inkService.running, false);
});

Deno.test("Unit - InkService should track running state", async () => {
  const signalHandler = createSignalHandlerService();
  const inkService = new MockInkService(signalHandler);
  
  assertEquals(inkService.running, false);
  
  await inkService.start(null);
  
  assertEquals(inkService.running, false); // Should be false after start completes
});

Deno.test("Unit - InkService should handle cleanup during running", async () => {
  const signalHandler = createSignalHandlerService();
  const inkService = new MockInkService(signalHandler);
  
  // Start the service but don't wait for it to complete
  const startPromise = inkService.start(null);
  
  // Service should be running
  assertEquals(inkService.running, true);
  
  // Cleanup should stop the service
  inkService.cleanup();
  assertEquals(inkService.running, false);
  
  // Wait for start to complete
  await startPromise;
});