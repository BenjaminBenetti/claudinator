import { assertEquals, assertRejects } from "@std/assert";
import {
  createGitHubApiError,
  GitHubApiError,
  withGitHubApiErrorHandling,
} from "./github-api-error.ts";

Deno.test("GitHubApiError constructor", () => {
  const error = new GitHubApiError(
    "Test error",
    401,
    "unauthorized",
    { data: { message: "Bad credentials" } },
    "req-123",
  );

  assertEquals(error.message, "Test error");
  assertEquals(error.status, 401);
  assertEquals(error.code, "unauthorized");
  assertEquals(error.response?.data?.message, "Bad credentials");
  assertEquals(error.requestId, "req-123");
  assertEquals(error.name, "GitHubApiError");
});

Deno.test("GitHubApiError getUserFriendlyMessage - 401 Unauthorized", () => {
  const error = new GitHubApiError("Unauthorized", 401);

  assertEquals(
    error.getUserFriendlyMessage(),
    'Authentication failed. Please run "gh auth login" to authenticate with GitHub.',
  );
});

Deno.test("GitHubApiError getUserFriendlyMessage - 403 Rate limit", () => {
  const error = new GitHubApiError(
    "Rate limit exceeded",
    403,
    "rate_limit_exceeded",
  );

  assertEquals(
    error.getUserFriendlyMessage(),
    "GitHub API rate limit exceeded. Please wait a few minutes before trying again.",
  );
});

Deno.test("GitHubApiError getUserFriendlyMessage - 403 Insufficient scope", () => {
  const error = new GitHubApiError(
    "Insufficient scope",
    403,
    "insufficient_scope",
  );

  assertEquals(
    error.getUserFriendlyMessage(),
    'Insufficient permissions. Please re-authenticate with "gh auth login" and ensure you have codespace access.',
  );
});

Deno.test("GitHubApiError getUserFriendlyMessage - 404 Not found", () => {
  const error = new GitHubApiError("Not found", 404);

  assertEquals(
    error.getUserFriendlyMessage(),
    "Resource not found. The codespace or repository may not exist or you may not have access to it.",
  );
});

Deno.test("GitHubApiError getUserFriendlyMessage - 422 Unprocessable", () => {
  const error = new GitHubApiError("Validation failed", 422);

  assertEquals(
    error.getUserFriendlyMessage(),
    "Invalid request. Please check your input parameters and try again.",
  );
});

Deno.test("GitHubApiError getUserFriendlyMessage - 429 Too many requests", () => {
  const error = new GitHubApiError("Too many requests", 429);

  assertEquals(
    error.getUserFriendlyMessage(),
    "Too many requests. Please wait a moment before trying again.",
  );
});

Deno.test("GitHubApiError getUserFriendlyMessage - 500 Server error", () => {
  const error = new GitHubApiError("Internal server error", 500);

  assertEquals(
    error.getUserFriendlyMessage(),
    "GitHub API is experiencing issues. Please try again later.",
  );
});

Deno.test("GitHubApiError getUserFriendlyMessage - Network error", () => {
  const error = new GitHubApiError("ENOTFOUND github.com");

  assertEquals(
    error.getUserFriendlyMessage(),
    "Network connection failed. Please check your internet connection and try again.",
  );
});

Deno.test("GitHubApiError getUserFriendlyMessage - Timeout error", () => {
  const error = new GitHubApiError("Request timeout");

  assertEquals(
    error.getUserFriendlyMessage(),
    "Request timed out. Please try again.",
  );
});

Deno.test("GitHubApiError getUserFriendlyMessage - Generic error", () => {
  const error = new GitHubApiError("Something went wrong");

  assertEquals(error.getUserFriendlyMessage(), "Something went wrong");
});

Deno.test("GitHubApiError isRetryable - 500 errors are retryable", () => {
  const error = new GitHubApiError("Server error", 500);
  assertEquals(error.isRetryable(), true);
});

Deno.test("GitHubApiError isRetryable - 429 errors are retryable", () => {
  const error = new GitHubApiError("Rate limit", 429);
  assertEquals(error.isRetryable(), true);
});

Deno.test("GitHubApiError isRetryable - Network errors are retryable", () => {
  const error = new GitHubApiError("timeout");
  assertEquals(error.isRetryable(), true);
});

Deno.test("GitHubApiError isRetryable - Auth errors are not retryable", () => {
  const error = new GitHubApiError("Unauthorized", 401);
  assertEquals(error.isRetryable(), false);
});

Deno.test("GitHubApiError isRetryable - Not found errors are not retryable", () => {
  const error = new GitHubApiError("Not found", 404);
  assertEquals(error.isRetryable(), false);
});

Deno.test("GitHubApiError getRetryDelay - 429 with retry-after header", () => {
  const error = new GitHubApiError("Rate limit", 429, undefined, {
    headers: { "retry-after": "120" },
  });

  assertEquals(error.getRetryDelay(), 120000); // 120 seconds in ms
});

Deno.test("GitHubApiError getRetryDelay - 429 without retry-after header", () => {
  const error = new GitHubApiError("Rate limit", 429);

  assertEquals(error.getRetryDelay(), 60000); // 1 minute default
});

Deno.test("GitHubApiError getRetryDelay - 500 errors", () => {
  const error = new GitHubApiError("Server error", 500);

  assertEquals(error.getRetryDelay(), 5000); // 5 seconds
});

Deno.test("GitHubApiError getRetryDelay - Network errors", () => {
  const error = new GitHubApiError("timeout");

  assertEquals(error.getRetryDelay(), 3000); // 3 seconds
});

Deno.test("GitHubApiError getRetryDelay - Non-retryable errors", () => {
  const error = new GitHubApiError("Unauthorized", 401);

  assertEquals(error.getRetryDelay(), null);
});

Deno.test("createGitHubApiError - Octokit RequestError", () => {
  const octokitError = {
    status: 404,
    response: {
      data: {
        message: "Not Found",
        code: "not_found",
      },
      headers: {
        "x-github-request-id": "req-123",
      },
    },
    message: "Not Found",
  };

  const error = createGitHubApiError(octokitError, "Test operation");

  assertEquals(error.message, "Test operation: Not Found");
  assertEquals(error.status, 404);
  assertEquals(error.code, "not_found");
  assertEquals(error.requestId, "req-123");
});

Deno.test("createGitHubApiError - Network error", () => {
  const networkError = {
    code: "ENOTFOUND",
    message: "getaddrinfo ENOTFOUND github.com",
  };

  const error = createGitHubApiError(networkError, "Network test");

  assertEquals(
    error.message,
    "Network test: Network error: getaddrinfo ENOTFOUND github.com",
  );
  assertEquals(error.status, undefined);
  assertEquals(error.code, "ENOTFOUND");
});

Deno.test("createGitHubApiError - Generic error", () => {
  const genericError = new Error("Something went wrong");

  const error = createGitHubApiError(genericError);

  assertEquals(error.message, "Something went wrong");
  assertEquals(error.status, undefined);
  assertEquals(error.code, undefined);
});

Deno.test("withGitHubApiErrorHandling - Success on first attempt", async () => {
  const mockOperation = () => Promise.resolve("success");

  const result = await withGitHubApiErrorHandling(
    mockOperation,
    "Test operation",
  );

  assertEquals(result, "success");
});

Deno.test("withGitHubApiErrorHandling - Non-retryable error", async () => {
  const mockOperation = () => {
    const error: any = new Error("Unauthorized");
    error.status = 401;
    return Promise.reject(error);
  };

  await assertRejects(
    () => withGitHubApiErrorHandling(mockOperation, "Test operation"),
    GitHubApiError,
    "Test operation: Unauthorized",
  );
});

Deno.test("withGitHubApiErrorHandling - Retryable error succeeds on retry", async () => {
  let attempts = 0;
  const mockOperation = () => {
    attempts++;
    if (attempts === 1) {
      const error: any = new Error("Server error");
      error.status = 500;
      return Promise.reject(error);
    }
    return Promise.resolve("success");
  };

  const result = await withGitHubApiErrorHandling(
    mockOperation,
    "Test operation",
  );

  assertEquals(result, "success");
  assertEquals(attempts, 2);
});

Deno.test("withGitHubApiErrorHandling - Retryable error fails after max retries", async () => {
  let attempts = 0;
  const mockOperation = () => {
    attempts++;
    const error: any = new Error("Server error");
    error.status = 500;
    return Promise.reject(error);
  };

  await assertRejects(
    () => withGitHubApiErrorHandling(mockOperation, "Test operation", 2),
    GitHubApiError,
    "Test operation: Server error",
  );

  assertEquals(attempts, 2);
});
