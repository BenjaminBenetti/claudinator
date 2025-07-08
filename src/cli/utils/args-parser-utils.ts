import { parseArgs } from "@std/cli";
import { displayHelp, displayVersion } from "./help-text-utils.ts";

export interface CliArgs {
  help: boolean;
  version: boolean;
  _: string[];
}

export function parseCliArgs(args: string[]): CliArgs {
  const parsed = parseArgs(args, {
    boolean: ["help", "version"],
    alias: {
      h: "help",
      v: "version"
    },
    default: {
      help: false,
      version: false
    }
  });

  return {
    help: parsed.help,
    version: parsed.version,
    _: parsed._ as string[]
  };
}

export function showHelp(): void {
  displayHelp();
}

export function showVersion(): void {
  displayVersion();
}