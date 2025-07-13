/**
 * Simple logger that writes to a file.
 */

const LOG_FILE_PATH = "~/.claudinator/log.txt";

/**
 * Expands a path that may contain ~ (home directory).
 */
function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") ||
      "/tmp";
    return `${homeDir}/${path.slice(2)}`;
  }
  return path;
}

/**
 * Formats arguments into a single string.
 */
function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") {
        return arg;
      }
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\n${arg.stack || ""}`;
      }
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

/**
 * Writes a log entry to the file.
 */
function writeToLog(level: string, message: string): void {
  try {
    const logPath = expandPath(LOG_FILE_PATH);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}\n`;

    // Ensure log directory exists
    const logDir = logPath.substring(0, logPath.lastIndexOf("/"));
    try {
      Deno.mkdirSync(logDir, { recursive: true });
    } catch {
      // Directory might already exist, ignore
    }

    Deno.writeTextFileSync(logPath, logEntry, { append: true });
  } catch (error) {
    // If logging fails, write to stderr as fallback
    console.error("Failed to write to log file:", error);
  }
}

/**
 * Basic logger class.
 */
class Logger {
  log(...args: unknown[]): void {
    const message = formatArgs(args);
    writeToLog("INFO", message);
  }

  info(...args: unknown[]): void {
    const message = formatArgs(args);
    writeToLog("INFO", message);
  }

  warn(...args: unknown[]): void {
    const message = formatArgs(args);
    writeToLog("WARN", message);
  }

  error(...args: unknown[]): void {
    const message = formatArgs(args);
    writeToLog("ERROR", message);
  }

  debug(...args: unknown[]): void {
    const message = formatArgs(args);
    writeToLog("DEBUG", message);
  }
}

/**
 * Exported logger instance.
 */
export const logger = new Logger();
