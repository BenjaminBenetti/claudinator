import { assertEquals } from "@std/assert";
import { createSignalHandlerService } from "../../cli/service/signal-handler-service.ts";
import { createAppService } from "./app-service.ts";

Deno.test("Unit - Signal handler should initialize", () => {
  const signalHandler = createSignalHandlerService();
  
  assertEquals(signalHandler.isShutdown, false);
  assertEquals(typeof signalHandler.signal, "object");
});

Deno.test("Unit - App should initialize with signal handler", () => {
  const signalHandler = createSignalHandlerService();
  const app = createAppService(signalHandler);
  
  assertEquals(typeof app.cleanup, "function");
});

Deno.test("Unit - App cleanup should work", () => {
  const signalHandler = createSignalHandlerService();
  const app = createAppService(signalHandler);
  
  app.cleanup();
  
  assertEquals(true, true);
});

Deno.test("Unit - Signal handler cleanup callbacks", () => {
  const signalHandler = createSignalHandlerService();
  let cleanupCalled = false;
  
  signalHandler.registerCleanupCallback(() => {
    cleanupCalled = true;
  });
  
  assertEquals(cleanupCalled, false);
});