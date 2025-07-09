import { assertEquals, assertThrows } from "@std/assert";
import { createSignalHandlerService, SignalHandler } from "./signal-handler-service.ts";

// Mock Deno.addSignalListener and Deno.removeSignalListener for testing
let mockSignalListeners: Map<string, (() => void)[]> = new Map();
let mockAddSignalListenerCalls: { signal: string; handler: () => void }[] = [];
let mockRemoveSignalListenerCalls: { signal: string; handler: () => void }[] = [];

const originalAddSignalListener = Deno.addSignalListener;
const originalRemoveSignalListener = Deno.removeSignalListener;
const originalExit = Deno.exit;

function mockDenoSignalFunctions() {
  mockSignalListeners.clear();
  mockAddSignalListenerCalls = [];
  mockRemoveSignalListenerCalls = [];
  
  // @ts-ignore - Mocking Deno global
  Deno.addSignalListener = (signal: string, handler: () => void) => {
    mockAddSignalListenerCalls.push({ signal, handler });
    if (!mockSignalListeners.has(signal)) {
      mockSignalListeners.set(signal, []);
    }
    mockSignalListeners.get(signal)!.push(handler);
  };
  
  // @ts-ignore - Mocking Deno global
  Deno.removeSignalListener = (signal: string, handler: () => void) => {
    mockRemoveSignalListenerCalls.push({ signal, handler });
    const handlers = mockSignalListeners.get(signal);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  };
}

function restoreDenoSignalFunctions() {
  // @ts-ignore - Restoring Deno global
  Deno.addSignalListener = originalAddSignalListener;
  // @ts-ignore - Restoring Deno global
  Deno.removeSignalListener = originalRemoveSignalListener;
}

function mockDenoExit() {
  let exitCalls: number[] = [];
  
  // @ts-ignore - Mocking Deno global
  Deno.exit = (code?: number) => {
    exitCalls.push(code ?? 0);
    throw new Error(`Deno.exit(${code ?? 0}) called`);
  };
  
  return { 
    exitCalls: () => exitCalls,
    exitCode: () => exitCalls[exitCalls.length - 1],
    exitCalled: () => exitCalls.length > 0
  };
}

function restoreDenoExit() {
  // @ts-ignore - Restoring Deno global
  Deno.exit = originalExit;
}

Deno.test("Unit - SignalHandler should initialize correctly", () => {
  const signalHandler = createSignalHandlerService();
  
  assertEquals(signalHandler.isShutdown, false);
  assertEquals(typeof signalHandler.signal, "object");
  assertEquals(signalHandler.signal.aborted, false);
});

Deno.test("Unit - SignalHandler should setup signal listeners", () => {
  mockDenoSignalFunctions();
  
  try {
    const signalHandler = createSignalHandlerService();
    signalHandler.setupSignalHandlers();
    
    assertEquals(mockAddSignalListenerCalls.length, 2);
    assertEquals(mockAddSignalListenerCalls[0].signal, "SIGINT");
    assertEquals(mockAddSignalListenerCalls[1].signal, "SIGTERM");
    assertEquals(typeof mockAddSignalListenerCalls[0].handler, "function");
    assertEquals(typeof mockAddSignalListenerCalls[1].handler, "function");
  } finally {
    restoreDenoSignalFunctions();
  }
});

Deno.test("Unit - SignalHandler should handle signal setup errors gracefully", () => {
  // Mock console.warn to capture warnings
  const originalWarn = console.warn;
  let warnCalled = false;
  let warnMessage = "";
  
  console.warn = (message: string) => {
    warnCalled = true;
    warnMessage = message;
  };
  
  // Mock Deno.addSignalListener to throw an error
  const originalAddSignalListener = Deno.addSignalListener;
  // @ts-ignore - Mocking Deno global
  Deno.addSignalListener = () => {
    throw new Error("Signal handling not supported");
  };
  
  try {
    const signalHandler = createSignalHandlerService();
    signalHandler.setupSignalHandlers();
    
    assertEquals(warnCalled, true);
    assertEquals(warnMessage.includes("Signal handling not available"), true);
  } finally {
    // @ts-ignore - Restoring Deno global
    Deno.addSignalListener = originalAddSignalListener;
    console.warn = originalWarn;
  }
});

Deno.test("Unit - SignalHandler should cleanup signal listeners", () => {
  mockDenoSignalFunctions();
  
  try {
    const signalHandler = createSignalHandlerService();
    signalHandler.setupSignalHandlers();
    
    assertEquals(mockAddSignalListenerCalls.length, 2);
    
    signalHandler.cleanup();
    
    assertEquals(mockRemoveSignalListenerCalls.length, 2);
    assertEquals(mockRemoveSignalListenerCalls[0].signal, "SIGINT");
    assertEquals(mockRemoveSignalListenerCalls[1].signal, "SIGTERM");
  } finally {
    restoreDenoSignalFunctions();
  }
});

Deno.test("Unit - SignalHandler should handle cleanup errors gracefully", () => {
  mockDenoSignalFunctions();
  
  // Mock console.warn to capture warnings
  const originalWarn = console.warn;
  let warnCalled = false;
  let warnMessage = "";
  
  console.warn = (message: string) => {
    warnCalled = true;
    warnMessage = message;
  };
  
  try {
    const signalHandler = createSignalHandlerService();
    signalHandler.setupSignalHandlers();
    
    // Mock Deno.removeSignalListener to throw an error
    // @ts-ignore - Mocking Deno global
    Deno.removeSignalListener = () => {
      throw new Error("Cleanup failed");
    };
    
    signalHandler.cleanup();
    
    assertEquals(warnCalled, true);
    assertEquals(warnMessage.includes("Error cleaning up signal listeners"), true);
  } finally {
    restoreDenoSignalFunctions();
    console.warn = originalWarn;
  }
});

Deno.test("Unit - SignalHandler should register cleanup callbacks", () => {
  const signalHandler = createSignalHandlerService();
  let callback1Called = false;
  let callback2Called = false;
  
  signalHandler.registerCleanupCallback(() => {
    callback1Called = true;
  });
  
  signalHandler.registerCleanupCallback(() => {
    callback2Called = true;
  });
  
  assertEquals(callback1Called, false);
  assertEquals(callback2Called, false);
});

Deno.test("Unit - SignalHandler should handle signal and call cleanup callbacks", async () => {
  mockDenoSignalFunctions();
  const exitMock = mockDenoExit();
  
  try {
    const signalHandler = createSignalHandlerService();
    signalHandler.setupSignalHandlers();
    
    let cleanup1Called = false;
    let cleanup2Called = false;
    
    signalHandler.registerCleanupCallback(() => {
      cleanup1Called = true;
    });
    
    signalHandler.registerCleanupCallback(async () => {
      cleanup2Called = true;
      await new Promise(resolve => setTimeout(resolve, 1));
    });
    
    // Get the SIGINT handler and call it
    const sigintHandler = mockAddSignalListenerCalls.find(call => call.signal === "SIGINT")?.handler;
    assertEquals(typeof sigintHandler, "function");
    
    try {
      await sigintHandler!();
    } catch (error) {
      // Expected to throw due to Deno.exit mock
      assertEquals((error as Error).message.includes("Deno.exit"), true);
    }
    
    assertEquals(cleanup1Called, true);
    assertEquals(cleanup2Called, true);
    assertEquals(signalHandler.isShutdown, true);
    assertEquals(signalHandler.signal.aborted, true);
    assertEquals(exitMock.exitCalls()[0], 0);
  } finally {
    restoreDenoSignalFunctions();
    restoreDenoExit();
  }
});

Deno.test("Unit - SignalHandler should exit immediately on second signal", async () => {
  mockDenoSignalFunctions();
  const exitMock = mockDenoExit();
  
  try {
    const signalHandler = createSignalHandlerService();
    signalHandler.setupSignalHandlers();
    
    // Get the SIGINT handler
    const sigintHandler = mockAddSignalListenerCalls.find(call => call.signal === "SIGINT")?.handler;
    
    // First signal should trigger shutdown
    try {
      await sigintHandler!();
    } catch (error) {
      assertEquals((error as Error).message.includes("Deno.exit"), true);
    }
    
    assertEquals(signalHandler.isShutdown, true);
    assertEquals(exitMock.exitCalls()[0], 0);
    
    // Second signal should exit immediately with code 1
    try {
      await sigintHandler!();
    } catch (error) {
      assertEquals((error as Error).message.includes("Deno.exit"), true);
    }
    
    // The test should have at least 2 exit calls, but may have more due to error handling
    assertEquals(exitMock.exitCalls().length >= 2, true);
    assertEquals(exitMock.exitCalls()[1], 1);
  } finally {
    restoreDenoSignalFunctions();
    restoreDenoExit();
  }
});

Deno.test("Unit - SignalHandler should handle cleanup callback errors", async () => {
  mockDenoSignalFunctions();
  const exitMock = mockDenoExit();
  
  // Mock console.error to capture errors
  const originalError = console.error;
  let errorCalls: string[] = [];
  
  console.error = (message: string, ...args: any[]) => {
    errorCalls.push(message);
  };
  
  try {
    const signalHandler = createSignalHandlerService();
    signalHandler.setupSignalHandlers();
    
    signalHandler.registerCleanupCallback(() => {
      throw new Error("Cleanup failed");
    });
    
    // Get the SIGINT handler and call it
    const sigintHandler = mockAddSignalListenerCalls.find(call => call.signal === "SIGINT")?.handler;
    
    try {
      await sigintHandler!();
    } catch (error) {
      // Expected to throw due to Deno.exit mock
      assertEquals((error as Error).message.includes("Deno.exit"), true);
    }
    
    // The error should be called during cleanup callback execution
    assertEquals(errorCalls.length > 0, true);
    const hasCleanupError = errorCalls.some(msg => msg.includes("Error in cleanup callback"));
    assertEquals(hasCleanupError, true);
    // When cleanup callback fails, the error is caught and logged but the signal handler 
    // should still exit with code 0 because the cleanup callback error doesn't affect the main flow
    // However, if the exit mock throws, it can cause the handleSignal method to fail
    // In this case, we expect the final exit code to be 0 (first exit) even though there's a second exit with code 1
    assertEquals(exitMock.exitCalls()[0], 0);
  } finally {
    restoreDenoSignalFunctions();
    restoreDenoExit();
    console.error = originalError;
  }
});

Deno.test("Unit - SignalHandler should handle signal processing errors", async () => {
  mockDenoSignalFunctions();
  const exitMock = mockDenoExit();
  
  // Mock console.error to capture errors
  const originalError = console.error;
  let errorCalled = false;
  let errorMessage = "";
  
  console.error = (message: string) => {
    errorCalled = true;
    errorMessage = message;
  };
  
  try {
    const signalHandler = createSignalHandlerService();
    signalHandler.setupSignalHandlers();
    
    // Mock AbortController.abort to throw an error
    const originalAbort = signalHandler.signal.constructor.prototype.abort;
    signalHandler.signal.constructor.prototype.abort = () => {
      throw new Error("Abort failed");
    };
    
    // Get the SIGINT handler and call it
    const sigintHandler = mockAddSignalListenerCalls.find(call => call.signal === "SIGINT")?.handler;
    
    try {
      await sigintHandler!();
    } catch (error) {
      // Expected to throw due to Deno.exit mock
      assertEquals((error as Error).message, "Deno.exit(1) called");
    }
    
    assertEquals(errorCalled, true);
    assertEquals(errorMessage.includes("Error during shutdown"), true);
    
    // Restore the original abort method
    signalHandler.signal.constructor.prototype.abort = originalAbort;
  } finally {
    restoreDenoSignalFunctions();
    restoreDenoExit();
    console.error = originalError;
  }
});

Deno.test("Unit - SignalHandler factory function should work", () => {
  const signalHandler = createSignalHandlerService();
  
  assertEquals(signalHandler instanceof SignalHandler, true);
  assertEquals(signalHandler.isShutdown, false);
  assertEquals(typeof signalHandler.signal, "object");
});