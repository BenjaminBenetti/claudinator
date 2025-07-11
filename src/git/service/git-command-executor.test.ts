import { assertEquals, assertInstanceOf, assertRejects } from "@std/assert";
import {
  createGitCommandExecutor,
  GitCommandError,
  GitCommandExecutor,
  NotAGitRepositoryError,
} from "./git-command-executor.ts";

// Mock for Deno.Command
class MockCommand {
  constructor(
    _program: string,
    private options: {
      args: string[];
      stdout: string;
      stderr: string;
      cwd?: string;
    },
  ) {}

  static mockResponses: Map<
    string,
    { code: number; stdout: string; stderr: string }
  > = new Map();

  static setMockResponse(
    args: string[],
    response: { code: number; stdout: string; stderr: string },
  ) {
    this.mockResponses.set(args.join(" "), response);
  }

  static clearMocks() {
    this.mockResponses.clear();
  }

  output(): Promise<
    { code: number; stdout: Uint8Array; stderr: Uint8Array }
  > {
    const key = this.options.args.join(" ");
    const response = MockCommand.mockResponses.get(key) ||
      { code: 0, stdout: "", stderr: "" };

    return Promise.resolve({
      code: response.code,
      stdout: new TextEncoder().encode(response.stdout),
      stderr: new TextEncoder().encode(response.stderr),
    });
  }
}

// Replace Deno.Command with our mock
const originalCommand = Deno.Command;
// @ts-ignore: Mocking global Deno.Command for testing
Deno.Command = MockCommand as typeof Deno.Command;

Deno.test({
  name: "GitCommandExecutor factory function",
  fn() {
    const executor = createGitCommandExecutor();
    assertInstanceOf(executor, GitCommandExecutor);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "checkIsRepository - valid repository",
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(["rev-parse", "--is-inside-work-tree"], {
      code: 0,
      stdout: "true\n",
      stderr: "",
    });

    const executor = new GitCommandExecutor();
    const isRepo = await executor.checkIsRepository();

    assertEquals(isRepo, true);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "checkIsRepository - not a repository",
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(["rev-parse", "--is-inside-work-tree"], {
      code: 128,
      stdout: "",
      stderr: "fatal: not a git repository",
    });

    const executor = new GitCommandExecutor();
    const isRepo = await executor.checkIsRepository();

    assertEquals(isRepo, false);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getCurrentBranch - normal branch",
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(["branch", "--show-current"], {
      code: 0,
      stdout: "main\n",
      stderr: "",
    });

    const executor = new GitCommandExecutor();
    const branch = await executor.getCurrentBranch();

    assertEquals(branch, "main");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getCurrentBranch - detached HEAD",
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(["branch", "--show-current"], {
      code: 0,
      stdout: "\n",
      stderr: "",
    });

    const executor = new GitCommandExecutor();
    const branch = await executor.getCurrentBranch();

    assertEquals(branch, null);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getCurrentBranch - fallback to older git",
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(["branch", "--show-current"], {
      code: 1,
      stdout: "",
      stderr: "unknown option",
    });
    MockCommand.setMockResponse(["rev-parse", "--abbrev-ref", "HEAD"], {
      code: 0,
      stdout: "feature-branch\n",
      stderr: "",
    });

    const executor = new GitCommandExecutor();
    const branch = await executor.getCurrentBranch();

    assertEquals(branch, "feature-branch");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getWorkingDirectoryStatus - clean repository",
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(["status", "--porcelain", "-z"], {
      code: 0,
      stdout: "",
      stderr: "",
    });

    const executor = new GitCommandExecutor();
    const status = await executor.getWorkingDirectoryStatus();

    assertEquals(status.length, 0);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getWorkingDirectoryStatus - with changes",
  async fn() {
    MockCommand.clearMocks();
    // Status format: XY filename\0
    const statusOutput =
      "M  modified-file.txt\0A  added-file.txt\0?? untracked-file.txt\0";
    MockCommand.setMockResponse(["status", "--porcelain", "-z"], {
      code: 0,
      stdout: statusOutput,
      stderr: "",
    });

    const executor = new GitCommandExecutor();
    const status = await executor.getWorkingDirectoryStatus();

    assertEquals(status.length, 3);
    assertEquals(status[0].path, "modified-file.txt");
    assertEquals(status[0].status, "modified");
    assertEquals(status[0].staged, true);

    assertEquals(status[1].path, "added-file.txt");
    assertEquals(status[1].status, "added");
    assertEquals(status[1].staged, true);

    assertEquals(status[2].path, "untracked-file.txt");
    assertEquals(status[2].status, "untracked");
    assertEquals(status[2].staged, false);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getRemotes - no remotes",
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(["remote", "-v"], {
      code: 0,
      stdout: "",
      stderr: "",
    });

    const executor = new GitCommandExecutor();
    const remotes = await executor.getRemotes();

    assertEquals(remotes.length, 0);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getRemotes - with remotes",
  async fn() {
    MockCommand.clearMocks();
    const remotesOutput =
      "origin\thttps://github.com/user/repo.git (fetch)\norigin\thttps://github.com/user/repo.git (push)\nupstream\thttps://github.com/upstream/repo.git (fetch)\nupstream\thttps://github.com/upstream/repo.git (push)\n";
    MockCommand.setMockResponse(["remote", "-v"], {
      code: 0,
      stdout: remotesOutput,
      stderr: "",
    });

    const executor = new GitCommandExecutor();
    const remotes = await executor.getRemotes();

    assertEquals(remotes.length, 2);
    assertEquals(remotes[0].name, "origin");
    assertEquals(remotes[0].fetchUrl, "https://github.com/user/repo.git");
    assertEquals(remotes[0].pushUrl, "https://github.com/user/repo.git");

    assertEquals(remotes[1].name, "upstream");
    assertEquals(remotes[1].fetchUrl, "https://github.com/upstream/repo.git");
    assertEquals(remotes[1].pushUrl, "https://github.com/upstream/repo.git");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getRepositoryRoot - success",
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(["rev-parse", "--show-toplevel"], {
      code: 0,
      stdout: "/home/user/projects/my-repo\n",
      stderr: "",
    });

    const executor = new GitCommandExecutor();
    const root = await executor.getRepositoryRoot();

    assertEquals(root, "/home/user/projects/my-repo");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getRepositoryRoot - not a git repository",
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(["rev-parse", "--show-toplevel"], {
      code: 128,
      stdout: "",
      stderr: "fatal: not a git repository",
    });

    const executor = new GitCommandExecutor();

    await assertRejects(
      () => executor.getRepositoryRoot(),
      NotAGitRepositoryError,
    );
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "error handling - command failure",
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(["status", "--porcelain", "-z"], {
      code: 1,
      stdout: "",
      stderr: "git: command not found",
    });

    const executor = new GitCommandExecutor();

    await assertRejects(
      () => executor.getWorkingDirectoryStatus(),
      GitCommandError,
      "Failed to get working directory status",
    );
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// Note: Timeout testing is difficult with mocks since they return immediately
// This would be better tested in integration tests with real git commands

// Restore original Deno.Command after all tests
Deno.test({
  name: "cleanup - restore Deno.Command",
  fn() {
    // @ts-ignore: Restoring global Deno.Command after testing
    Deno.Command = originalCommand;
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
