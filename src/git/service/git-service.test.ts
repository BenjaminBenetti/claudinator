import { assertEquals, assertInstanceOf, assertRejects } from "@std/assert";
import { createGitService, GitServiceImpl } from "./git-service.ts";
import type { IGitCommandExecutor } from "./git-command-executor.ts";
import { NotAGitRepositoryError } from "./git-command-executor.ts";
import type { FileStatus, GitRemote } from "../models/git-status-model.ts";

// Mock implementation of IGitCommandExecutor
class MockGitCommandExecutor implements IGitCommandExecutor {
  static mockResponses: Map<string, unknown> = new Map();

  static setMockResponse(method: string, response: unknown) {
    this.mockResponses.set(method, response);
  }

  static clearMocks() {
    this.mockResponses.clear();
  }

  checkIsRepository(_workingDirectory?: string): Promise<boolean> {
    const response = MockGitCommandExecutor.mockResponses.get(
      "checkIsRepository",
    );
    if (response instanceof Error) throw response;
    return Promise.resolve(response as boolean ?? true);
  }

  getCurrentBranch(_workingDirectory?: string): Promise<string | null> {
    const response = MockGitCommandExecutor.mockResponses.get(
      "getCurrentBranch",
    );
    if (response instanceof Error) throw response;
    return Promise.resolve(
      response !== undefined ? response as string | null : "main",
    );
  }

  getWorkingDirectoryStatus(
    _workingDirectory?: string,
  ): Promise<FileStatus[]> {
    const response = MockGitCommandExecutor.mockResponses.get(
      "getWorkingDirectoryStatus",
    );
    if (response instanceof Error) throw response;
    return Promise.resolve(response as FileStatus[] ?? []);
  }

  getRemotes(_workingDirectory?: string): Promise<GitRemote[]> {
    const response = MockGitCommandExecutor.mockResponses.get("getRemotes");
    if (response instanceof Error) throw response;
    return Promise.resolve(response as GitRemote[] ?? []);
  }

  getRepositoryRoot(_workingDirectory?: string): Promise<string> {
    const response = MockGitCommandExecutor.mockResponses.get(
      "getRepositoryRoot",
    );
    if (response instanceof Error) throw response;
    return Promise.resolve(response as string ?? "/home/user/project");
  }
}

Deno.test({
  name: "GitService factory function",
  fn() {
    const mockExecutor = new MockGitCommandExecutor();
    const service = createGitService(mockExecutor);
    assertInstanceOf(service, GitServiceImpl);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getStatus - not a git repository",
  async fn() {
    MockGitCommandExecutor.clearMocks();
    MockGitCommandExecutor.setMockResponse("checkIsRepository", false);

    const executor = new MockGitCommandExecutor();
    const service = new GitServiceImpl(executor);
    const status = await service.getStatus();

    assertEquals(status.isRepository, false);
    assertEquals(status.currentBranch, null);
    assertEquals(status.isDetachedHead, false);
    assertEquals(status.hasUncommittedChanges, false);
    assertEquals(status.workingDirectoryStatus.length, 0);
    assertEquals(status.repository, null);
    assertEquals(status.remotes.length, 0);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getStatus - clean repository on main branch",
  async fn() {
    MockGitCommandExecutor.clearMocks();
    MockGitCommandExecutor.setMockResponse("checkIsRepository", true);
    MockGitCommandExecutor.setMockResponse("getCurrentBranch", "main");
    MockGitCommandExecutor.setMockResponse("getWorkingDirectoryStatus", []);
    MockGitCommandExecutor.setMockResponse("getRemotes", [{
      name: "origin",
      fetchUrl: "https://github.com/user/repo.git",
      pushUrl: "https://github.com/user/repo.git",
    }]);
    MockGitCommandExecutor.setMockResponse(
      "getRepositoryRoot",
      "/home/user/my-project",
    );

    const executor = new MockGitCommandExecutor();
    const service = new GitServiceImpl(executor);
    const status = await service.getStatus();

    assertEquals(status.isRepository, true);
    assertEquals(status.currentBranch, "main");
    assertEquals(status.isDetachedHead, false);
    assertEquals(status.hasUncommittedChanges, false);
    assertEquals(status.workingDirectoryStatus.length, 0);
    assertEquals(status.repository?.name, "my-project");
    assertEquals(status.repository?.path, "/home/user/my-project");
    assertEquals(status.remotes.length, 1);
    assertEquals(status.remotes[0].name, "origin");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getStatus - detached HEAD state",
  async fn() {
    MockGitCommandExecutor.clearMocks();
    MockGitCommandExecutor.setMockResponse("checkIsRepository", true);
    MockGitCommandExecutor.setMockResponse("getCurrentBranch", null);
    MockGitCommandExecutor.setMockResponse("getWorkingDirectoryStatus", []);
    MockGitCommandExecutor.setMockResponse("getRemotes", []);
    MockGitCommandExecutor.setMockResponse(
      "getRepositoryRoot",
      "/home/user/project",
    );

    const executor = new MockGitCommandExecutor();
    const service = new GitServiceImpl(executor);
    const status = await service.getStatus();

    assertEquals(status.isRepository, true);
    assertEquals(status.currentBranch, null);
    assertEquals(status.isDetachedHead, true);
    assertEquals(status.hasUncommittedChanges, false);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getStatus - repository with uncommitted changes",
  async fn() {
    MockGitCommandExecutor.clearMocks();
    MockGitCommandExecutor.setMockResponse("checkIsRepository", true);
    MockGitCommandExecutor.setMockResponse(
      "getCurrentBranch",
      "feature-branch",
    );
    MockGitCommandExecutor.setMockResponse("getWorkingDirectoryStatus", [
      { path: "file1.txt", status: "modified", staged: false },
      { path: "file2.txt", status: "added", staged: true },
    ]);
    MockGitCommandExecutor.setMockResponse("getRemotes", []);
    MockGitCommandExecutor.setMockResponse(
      "getRepositoryRoot",
      "/home/user/project",
    );

    const executor = new MockGitCommandExecutor();
    const service = new GitServiceImpl(executor);
    const status = await service.getStatus();

    assertEquals(status.isRepository, true);
    assertEquals(status.currentBranch, "feature-branch");
    assertEquals(status.isDetachedHead, false);
    assertEquals(status.hasUncommittedChanges, true);
    assertEquals(status.workingDirectoryStatus.length, 2);
    assertEquals(status.workingDirectoryStatus[0].path, "file1.txt");
    assertEquals(status.workingDirectoryStatus[0].status, "modified");
    assertEquals(status.workingDirectoryStatus[0].staged, false);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getStatus - multiple remotes",
  async fn() {
    MockGitCommandExecutor.clearMocks();
    MockGitCommandExecutor.setMockResponse("checkIsRepository", true);
    MockGitCommandExecutor.setMockResponse("getCurrentBranch", "main");
    MockGitCommandExecutor.setMockResponse("getWorkingDirectoryStatus", []);
    MockGitCommandExecutor.setMockResponse("getRemotes", [
      {
        name: "origin",
        fetchUrl: "https://github.com/user/repo.git",
        pushUrl: "https://github.com/user/repo.git",
      },
      {
        name: "upstream",
        fetchUrl: "https://github.com/upstream/repo.git",
        pushUrl: "https://github.com/upstream/repo.git",
      },
    ]);
    MockGitCommandExecutor.setMockResponse(
      "getRepositoryRoot",
      "/home/user/project",
    );

    const executor = new MockGitCommandExecutor();
    const service = new GitServiceImpl(executor);
    const status = await service.getStatus();

    assertEquals(status.remotes.length, 2);
    assertEquals(status.remotes[0].name, "origin");
    assertEquals(status.remotes[1].name, "upstream");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getStatus - error handling for NotAGitRepositoryError",
  async fn() {
    MockGitCommandExecutor.clearMocks();
    MockGitCommandExecutor.setMockResponse("checkIsRepository", true);
    MockGitCommandExecutor.setMockResponse(
      "getCurrentBranch",
      new NotAGitRepositoryError("/some/path"),
    );

    const executor = new MockGitCommandExecutor();
    const service = new GitServiceImpl(executor);

    await assertRejects(
      () => service.getStatus(),
      NotAGitRepositoryError,
    );
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getStatus - error propagation when git command fails",
  async fn() {
    MockGitCommandExecutor.clearMocks();
    MockGitCommandExecutor.setMockResponse("checkIsRepository", true);
    MockGitCommandExecutor.setMockResponse(
      "getCurrentBranch",
      new Error("Branch detection failed"),
    );

    const executor = new MockGitCommandExecutor();
    const service = new GitServiceImpl(executor);

    // Service should propagate errors instead of suppressing them
    await assertRejects(
      () => service.getStatus(),
      Error,
      "Branch detection failed",
    );
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getStatus - repository name extraction",
  async fn() {
    MockGitCommandExecutor.clearMocks();
    MockGitCommandExecutor.setMockResponse("checkIsRepository", true);
    MockGitCommandExecutor.setMockResponse("getCurrentBranch", "main");
    MockGitCommandExecutor.setMockResponse("getWorkingDirectoryStatus", []);
    MockGitCommandExecutor.setMockResponse("getRemotes", []);
    MockGitCommandExecutor.setMockResponse(
      "getRepositoryRoot",
      "/path/to/my-awesome-project",
    );

    const executor = new MockGitCommandExecutor();
    const service = new GitServiceImpl(executor);
    const status = await service.getStatus();

    assertEquals(status.repository?.name, "my-awesome-project");
    assertEquals(status.repository?.path, "/path/to/my-awesome-project");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "getStatus - with custom working directory",
  async fn() {
    MockGitCommandExecutor.clearMocks();
    MockGitCommandExecutor.setMockResponse("checkIsRepository", true);
    MockGitCommandExecutor.setMockResponse("getCurrentBranch", "main");
    MockGitCommandExecutor.setMockResponse("getWorkingDirectoryStatus", []);
    MockGitCommandExecutor.setMockResponse("getRemotes", []);
    MockGitCommandExecutor.setMockResponse(
      "getRepositoryRoot",
      "/custom/path/project",
    );

    const executor = new MockGitCommandExecutor();
    const service = new GitServiceImpl(executor);
    const status = await service.getStatus("/custom/path");

    assertEquals(status.repository?.name, "project");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
