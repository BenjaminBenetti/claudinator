import { createCliRunnerService } from "./cli/service/cli-runner-service.ts";

async function main(): Promise<number> {
  try {
    const cliRunner = createCliRunnerService();
    const args = Deno.args;
    
    return await cliRunner.run(args);
  } catch (error) {
    console.error("Fatal error:", error);
    return 1;
  }
}

if (import.meta.main) {
  const exitCode = await main();
  Deno.exit(exitCode);
}