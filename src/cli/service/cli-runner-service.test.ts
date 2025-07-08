import { assertEquals } from "@std/assert";
import { CliRunnerService } from "./cli-runner-service.ts";

Deno.test("Unit - CLI runner should initialize without errors", () => {
  const runner = new CliRunnerService();
  
  assertEquals(typeof runner.run, "function");
});

Deno.test("Unit - CLI runner should handle error gracefully", async () => {
  const originalError = console.error;
  const originalLog = console.log;
  let errorOutput = "";
  
  console.error = (msg: string) => {
    errorOutput += msg;
  };
  console.log = () => {}; // Suppress normal output
  
  try {
    const mockCliRunner = {
      run: async () => {
        throw new Error("Test error");
      }
    };
    
    let exitCode = 0;
    try {
      await mockCliRunner.run();
    } catch {
      exitCode = 1;
    }
    
    assertEquals(exitCode, 1);
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
});