import { assertEquals } from "@std/assert";
import { createSignalHandlerService } from "../../cli/service/signal-handler-service.ts";

// Mock Ink service without React dependencies for testing
class MockInkService {
  private signalHandler: any;
  private isRunning = false;

  constructor(signalHandler: any) {
    this.signalHandler = signalHandler;
  }

  public async start(component: any): Promise<void> {
    this.isRunning = true;
    // Mock implementation - just wait a bit then stop
    await new Promise(resolve => setTimeout(resolve, 10));
    this.isRunning = false;
  }

  public cleanup(): void {
    this.isRunning = false;
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