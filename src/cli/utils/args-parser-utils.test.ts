import { assertEquals } from "@std/assert";
import { parseCliArgs, showHelp, showVersion } from "./args-parser-utils.ts";

Deno.test("parseCliArgs - should parse help flag", () => {
  const args = ["--help"];
  const result = parseCliArgs(args);
  
  assertEquals(result.help, true);
  assertEquals(result.version, false);
  assertEquals(result._, []);
});

Deno.test("parseCliArgs - should parse help flag with alias", () => {
  const args = ["-h"];
  const result = parseCliArgs(args);
  
  assertEquals(result.help, true);
  assertEquals(result.version, false);
  assertEquals(result._, []);
});

Deno.test("parseCliArgs - should parse version flag", () => {
  const args = ["--version"];
  const result = parseCliArgs(args);
  
  assertEquals(result.help, false);
  assertEquals(result.version, true);
  assertEquals(result._, []);
});

Deno.test("parseCliArgs - should parse version flag with alias", () => {
  const args = ["-v"];
  const result = parseCliArgs(args);
  
  assertEquals(result.help, false);
  assertEquals(result.version, true);
  assertEquals(result._, []);
});

Deno.test("parseCliArgs - should handle no arguments", () => {
  const args: string[] = [];
  const result = parseCliArgs(args);
  
  assertEquals(result.help, false);
  assertEquals(result.version, false);
  assertEquals(result._, []);
});

Deno.test("parseCliArgs - should handle multiple flags", () => {
  const args = ["--help", "--version"];
  const result = parseCliArgs(args);
  
  assertEquals(result.help, true);
  assertEquals(result.version, true);
  assertEquals(result._, []);
});

Deno.test("parseCliArgs - should handle positional arguments", () => {
  const args = ["arg1", "arg2", "--help"];
  const result = parseCliArgs(args);
  
  assertEquals(result.help, true);
  assertEquals(result.version, false);
  assertEquals(result._, ["arg1", "arg2"]);
});

Deno.test("showHelp - should not throw", () => {
  const originalLog = console.log;
  let output = "";
  
  console.log = (msg: string) => {
    output += msg;
  };
  
  try {
    showHelp();
    assertEquals(output.includes("Claudinator"), true);
    assertEquals(output.includes("USAGE:"), true);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("showVersion - should not throw", () => {
  const originalLog = console.log;
  let output = "";
  
  console.log = (msg: string) => {
    output += msg;
  };
  
  try {
    showVersion();
    assertEquals(output.includes("Claudinator"), true);
    assertEquals(output.includes("v1.0.0"), true);
  } finally {
    console.log = originalLog;
  }
});