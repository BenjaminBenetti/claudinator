import { assertEquals, assertInstanceOf, assertRejects } from "@std/assert";
import {
  createGitHubCodespaceRepository,
  GitHubCodespaceRepositoryImpl,
  GitHubRepositoryError,
} from "./github-codespace-repo.ts";
import type { IOctokitClient } from "../utils/octokit-client.ts";
import type {
  Codespace,
  CreateCodespaceOptions,
} from "../models/codespace-model.ts";
import {
  createMinimalRepository,
  createSimpleUser,
} from "../utils/test-helpers.ts";

// Mock Octokit client
class MockOctokitClient implements IOctokitClient {
  public findAllCalls: string[] = [];
  public findByNameCalls: string[] = [];
  public createCalls: Array<
    { owner: string; repo: string; options: CreateCodespaceOptions }
  > = [];
  public deleteCalls: string[] = [];
  public startCalls: string[] = [];
  public stopCalls: string[] = [];

  private mockCodespaces: Codespace[] = [];
  private shouldThrowOnAuth = false;
  private shouldThrowOnList = false;
  private shouldThrowOnGet = false;
  private shouldThrowOnCreate = false;
  private shouldThrowOnDelete = false;
  private shouldReturnNotFound = false;

  setMockCodespaces(codespaces: Codespace[]) {
    this.mockCodespaces = codespaces;
  }

  setShouldThrowOnAuth(shouldThrow: boolean) {
    this.shouldThrowOnAuth = shouldThrow;
  }

  setShouldThrowOnList(shouldThrow: boolean) {
    this.shouldThrowOnList = shouldThrow;
  }

  setShouldThrowOnGet(shouldThrow: boolean) {
    this.shouldThrowOnGet = shouldThrow;
  }

  setShouldThrowOnCreate(shouldThrow: boolean) {
    this.shouldThrowOnCreate = shouldThrow;
  }

  setShouldThrowOnDelete(shouldThrow: boolean) {
    this.shouldThrowOnDelete = shouldThrow;
  }

  setShouldReturnNotFound(shouldReturn: boolean) {
    this.shouldReturnNotFound = shouldReturn;
  }

  async getOctokit() {
    if (this.shouldThrowOnAuth) {
      throw new Error("Auth failed");
    }

    return {
      rest: {
        codespaces: {
          listForAuthenticatedUser: async () => {
            if (this.shouldThrowOnList) {
              throw new Error("List failed");
            }
            this.findAllCalls.push("all");
            return { data: { codespaces: [...this.mockCodespaces] } };
          },

          listInRepositoryForAuthenticatedUser: async (
            { owner, repo }: { owner: string; repo: string },
          ) => {
            if (this.shouldThrowOnList) {
              throw new Error("List failed");
            }
            this.findAllCalls.push(`${owner}/${repo}`);
            const filtered = this.mockCodespaces.filter((cs) =>
              cs.repository.owner.login === owner && cs.repository.name === repo
            );
            return { data: { codespaces: filtered } };
          },

          getForAuthenticatedUser: async (
            { codespace_name }: { codespace_name: string },
          ) => {
            this.findByNameCalls.push(codespace_name);

            if (this.shouldReturnNotFound) {
              const error: any = new Error("Not found");
              error.status = 404;
              throw error;
            }

            if (this.shouldThrowOnGet) {
              throw new Error("Get failed");
            }

            const found = this.mockCodespaces.find((cs) =>
              cs.name === codespace_name
            );
            if (!found) {
              const error: any = new Error("Not found");
              error.status = 404;
              throw error;
            }
            return { data: found };
          },

          createForAuthenticatedUser: async (
            { repository_id, ...options }: any,
          ) => {
            // For testing purposes, extract owner/repo from the most recent repos.get call
            const owner = "test-owner";
            const repo = "test-repo";
            this.createCalls.push({ owner, repo, options });

            if (this.shouldThrowOnCreate) {
              throw new Error("Create failed");
            }

            const newCodespace: Codespace = {
              id: 123456789,
              name: "mock-codespace-123",
              environment_id: "env-123",
              owner: {
                login: owner,
                id: 1,
                node_id: "node1",
                avatar_url: "",
                gravatar_id: null,
                url: "",
                html_url: "",
                followers_url: "",
                following_url: "",
                gists_url: "",
                starred_url: "",
                subscriptions_url: "",
                organizations_url: "",
                repos_url: "",
                events_url: "",
                received_events_url: "",
                type: "User",
                site_admin: false,
              },
              billable_owner: {
                login: owner,
                id: 1,
                node_id: "node1",
                avatar_url: "",
                gravatar_id: null,
                url: "",
                html_url: "",
                followers_url: "",
                following_url: "",
                gists_url: "",
                starred_url: "",
                subscriptions_url: "",
                organizations_url: "",
                repos_url: "",
                events_url: "",
                received_events_url: "",
                type: "User",
                site_admin: false,
              },
              repository: createMinimalRepository({
                id: 67890,
                node_id: "repo-node",
                name: repo,
                full_name: `${owner}/${repo}`,
                owner: createSimpleUser({
                  login: owner,
                  id: 1,
                  node_id: "node1",
                }),
                private: false,
                html_url: `https://github.com/${owner}/${repo}`,
                description: null,
              }),
              machine: {
                name: options.machine || "basicLinux32gb",
                display_name: "Basic",
                operating_system: "linux" as const,
                storage_in_bytes: 32000000000,
                memory_in_bytes: 8000000000,
                cpus: 2,
                prebuild_availability: null,
              },
              devcontainer_path: ".devcontainer/devcontainer.json",
              prebuild: false,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
              last_used_at: "2024-01-01T00:00:00Z",
              state: "Starting" as const,
              url: "https://api.github.com/user/codespaces/mock-codespace-123",
              git_status: {
                ahead: 0,
                behind: 0,
                has_unpushed_changes: false,
                has_uncommitted_changes: false,
                ref: options.ref || "main",
              },
              location: "EastUs" as const,
              idle_timeout_minutes: 30,
              web_url: "https://mock-codespace-123.github.dev",
              machines_url:
                "https://api.github.com/user/codespaces/mock-codespace-123/machines",
              start_url:
                "https://api.github.com/user/codespaces/mock-codespace-123/start",
              stop_url:
                "https://api.github.com/user/codespaces/mock-codespace-123/stop",
              recent_folders: [],
              pulls_url:
                "https://api.github.com/user/codespaces/mock-codespace-123/pulls",
            };

            return { data: newCodespace };
          },

          deleteForAuthenticatedUser: async (
            { codespace_name }: { codespace_name: string },
          ) => {
            this.deleteCalls.push(codespace_name);

            if (this.shouldThrowOnDelete) {
              throw new Error("Delete failed");
            }
          },

          startForAuthenticatedUser: async (
            { codespace_name }: { codespace_name: string },
          ) => {
            this.startCalls.push(codespace_name);
            const found = this.mockCodespaces.find((cs) =>
              cs.name === codespace_name
            );
            if (!found) throw new Error("Not found");
            return { data: { ...found, state: "Available" as const } };
          },

          stopForAuthenticatedUser: async (
            { codespace_name }: { codespace_name: string },
          ) => {
            this.stopCalls.push(codespace_name);
            const found = this.mockCodespaces.find((cs) =>
              cs.name === codespace_name
            );
            if (!found) throw new Error("Not found");
            return { data: { ...found, state: "Shutdown" as const } };
          },
        },
        repos: {
          get: ({ owner, repo }: { owner: string; repo: string }) => {
            return {
              data: {
                id: 67890,
                name: repo,
                full_name: `${owner}/${repo}`,
                owner: { login: owner, id: 1 },
                private: false,
              },
            };
          },
        },
      },
    } as any;
  }
}

function createMockCodespace(overrides: Partial<Codespace> = {}): Codespace {
  return {
    id: 123456789,
    name: "test-codespace-123",
    environment_id: "env-123",
    owner: {
      login: "test-owner",
      id: 1,
      node_id: "node1",
      avatar_url: "",
      url: "",
      html_url: "",
      type: "User",
      site_admin: false,
    },
    billable_owner: {
      login: "test-owner",
      id: 1,
      node_id: "node1",
      avatar_url: "",
      url: "",
      html_url: "",
      type: "User",
      site_admin: false,
    },
    repository: createMinimalRepository({
      id: 67890,
      node_id: "repo-node",
      name: "test-repo",
      full_name: "test-owner/test-repo",
      owner: createSimpleUser({ login: "test-owner", id: 1, node_id: "node1" }),
      private: false,
      html_url: "https://github.com/test-owner/test-repo",
      description: null,
    }),
    machine: {
      name: "basicLinux32gb",
      display_name: "Basic",
      operating_system: "linux" as const,
      storage_in_bytes: 32000000000,
      memory_in_bytes: 8000000000,
      cpus: 2,
      prebuild_availability: null,
    },
    devcontainer_path: ".devcontainer/devcontainer.json",
    prebuild: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    last_used_at: "2024-01-02T00:00:00Z",
    state: "Available",
    url: "https://api.github.com/user/codespaces/test-codespace-123",
    git_status: {
      ahead: 0,
      behind: 0,
      has_unpushed_changes: false,
      has_uncommitted_changes: false,
      ref: "main",
    },
    location: "EastUs",
    idle_timeout_minutes: 30,
    web_url: "https://test-codespace-123.github.dev",
    machines_url:
      "https://api.github.com/user/codespaces/test-codespace-123/machines",
    start_url:
      "https://api.github.com/user/codespaces/test-codespace-123/start",
    stop_url: "https://api.github.com/user/codespaces/test-codespace-123/stop",
    recent_folders: [],
    ...overrides,
  } as Codespace;
}

Deno.test("GitHubCodespaceRepository factory function", () => {
  const mockClient = new MockOctokitClient();
  const repository = createGitHubCodespaceRepository(mockClient);
  assertInstanceOf(repository, GitHubCodespaceRepositoryImpl);
});

Deno.test("findAll without repository filter", async () => {
  const mockClient = new MockOctokitClient();
  const mockCodespaces = [
    createMockCodespace({ name: "codespace-1" }),
    createMockCodespace({ name: "codespace-2" }),
  ];
  mockClient.setMockCodespaces(mockCodespaces);

  const repository = new GitHubCodespaceRepositoryImpl(mockClient);
  const result = await repository.findAll();

  assertEquals(result.length, 2);
  assertEquals(result[0].name, "codespace-1");
  assertEquals(result[1].name, "codespace-2");
  assertEquals(mockClient.findAllCalls, ["all"]);
});

Deno.test("findAll with repository filter", async () => {
  const mockClient = new MockOctokitClient();
  const mockCodespaces = [
    createMockCodespace({
      name: "codespace-1",
      repository: createMinimalRepository({
        id: 1,
        node_id: "node1",
        name: "repo1",
        full_name: "owner1/repo1",
        owner: createSimpleUser({
          login: "owner1",
          id: 1,
          node_id: "node1",
        }),
        private: false,
        html_url: "https://github.com/owner1/repo1",
        description: null,
      }),
    }),
    createMockCodespace({
      name: "codespace-2",
      repository: createMinimalRepository({
        id: 2,
        node_id: "node2",
        name: "repo2",
        full_name: "owner2/repo2",
        owner: createSimpleUser({
          login: "owner2",
          id: 2,
          node_id: "node2",
        }),
        private: false,
        html_url: "https://github.com/owner2/repo2",
        description: null,
      }),
    }),
  ];
  mockClient.setMockCodespaces(mockCodespaces);

  const repository = new GitHubCodespaceRepositoryImpl(mockClient);
  const result = await repository.findAll("owner1/repo1");

  assertEquals(result.length, 1);
  assertEquals(result[0].name, "codespace-1");
  assertEquals(mockClient.findAllCalls, ["owner1/repo1"]);
});

Deno.test("findAll throws GitHubRepositoryError on failure", async () => {
  const mockClient = new MockOctokitClient();
  mockClient.setShouldThrowOnList(true);

  const repository = new GitHubCodespaceRepositoryImpl(mockClient);

  await assertRejects(
    () => repository.findAll(),
    GitHubRepositoryError,
    "Failed to list codespaces",
  );
});

Deno.test("findByName success", async () => {
  const mockClient = new MockOctokitClient();
  const mockCodespace = createMockCodespace({ name: "target-codespace" });
  mockClient.setMockCodespaces([mockCodespace]);

  const repository = new GitHubCodespaceRepositoryImpl(mockClient);
  const result = await repository.findByName("target-codespace");

  assertEquals(result?.name, "target-codespace");
  assertEquals(mockClient.findByNameCalls, ["target-codespace"]);
});

Deno.test("findByName returns null when not found", async () => {
  const mockClient = new MockOctokitClient();
  mockClient.setShouldReturnNotFound(true);

  const repository = new GitHubCodespaceRepositoryImpl(mockClient);
  const result = await repository.findByName("nonexistent");

  assertEquals(result, null);
});

Deno.test("findByName throws GitHubRepositoryError on other errors", async () => {
  const mockClient = new MockOctokitClient();
  mockClient.setShouldThrowOnGet(true);

  const repository = new GitHubCodespaceRepositoryImpl(mockClient);

  await assertRejects(
    () => repository.findByName("test"),
    GitHubRepositoryError,
    "Failed to get codespace test",
  );
});

Deno.test("create with valid options", async () => {
  const mockClient = new MockOctokitClient();
  const repository = new GitHubCodespaceRepositoryImpl(mockClient);

  const options: CreateCodespaceOptions = {
    ref: "feature-branch",
    machine: "standardLinux32gb",
  };

  const result = await repository.create("owner", "repo", options);

  assertEquals(result.name, "mock-codespace-123");
  assertEquals(result.git_status.ref, "feature-branch");
  assertEquals(mockClient.createCalls.length, 1);
  assertEquals(mockClient.createCalls[0].owner, "test-owner");
  assertEquals(mockClient.createCalls[0].repo, "test-repo");
});

Deno.test("create validation - empty owner", async () => {
  const mockClient = new MockOctokitClient();
  const repository = new GitHubCodespaceRepositoryImpl(mockClient);

  await assertRejects(
    () => repository.create("", "repo", {}),
    GitHubRepositoryError,
    "Owner is required for codespace creation",
  );
});

Deno.test("create validation - empty repo", async () => {
  const mockClient = new MockOctokitClient();
  const repository = new GitHubCodespaceRepositoryImpl(mockClient);

  await assertRejects(
    () => repository.create("owner", "", {}),
    GitHubRepositoryError,
    "Repository name is required for codespace creation",
  );
});

Deno.test("create validation - invalid retention period", async () => {
  const mockClient = new MockOctokitClient();
  const repository = new GitHubCodespaceRepositoryImpl(mockClient);

  await assertRejects(
    () => repository.create("owner", "repo", { retention_period_minutes: 0 }),
    GitHubRepositoryError,
    "Retention period must be a positive integer",
  );

  await assertRejects(
    () =>
      repository.create("owner", "repo", { retention_period_minutes: 50000 }),
    GitHubRepositoryError,
    "Retention period cannot exceed 30 days",
  );
});

Deno.test("delete success", async () => {
  const mockClient = new MockOctokitClient();
  const repository = new GitHubCodespaceRepositoryImpl(mockClient);

  await repository.delete("test-codespace");

  assertEquals(mockClient.deleteCalls.length, 1);
  assertEquals(mockClient.deleteCalls[0], "test-codespace");
});

Deno.test("delete validation - empty name", async () => {
  const mockClient = new MockOctokitClient();
  const repository = new GitHubCodespaceRepositoryImpl(mockClient);

  await assertRejects(
    () => repository.delete(""),
    GitHubRepositoryError,
    "Codespace name is required for deletion",
  );
});

Deno.test("delete throws GitHubRepositoryError on failure", async () => {
  const mockClient = new MockOctokitClient();
  mockClient.setShouldThrowOnDelete(true);
  const repository = new GitHubCodespaceRepositoryImpl(mockClient);

  await assertRejects(
    () => repository.delete("test"),
    GitHubRepositoryError,
    "Failed to delete codespace test",
  );
});

Deno.test("startCodespace success", async () => {
  const mockClient = new MockOctokitClient();
  const mockCodespace = createMockCodespace({
    name: "test-codespace",
    state: "Shutdown",
  });
  mockClient.setMockCodespaces([mockCodespace]);

  const repository = new GitHubCodespaceRepositoryImpl(mockClient);
  const result = await repository.startCodespace("test-codespace");

  assertEquals(result.state, "Available");
  assertEquals(mockClient.startCalls, ["test-codespace"]);
});

Deno.test("stopCodespace success", async () => {
  const mockClient = new MockOctokitClient();
  const mockCodespace = createMockCodespace({
    name: "test-codespace",
    state: "Available",
  });
  mockClient.setMockCodespaces([mockCodespace]);

  const repository = new GitHubCodespaceRepositoryImpl(mockClient);
  const result = await repository.stopCodespace("test-codespace");

  assertEquals(result.state, "Shutdown");
  assertEquals(mockClient.stopCalls, ["test-codespace"]);
});

Deno.test("deleteAll without filters", async () => {
  const mockClient = new MockOctokitClient();
  const mockCodespaces = [
    createMockCodespace({ name: "codespace-1" }),
    createMockCodespace({ name: "codespace-2" }),
  ];
  mockClient.setMockCodespaces(mockCodespaces);

  const repository = new GitHubCodespaceRepositoryImpl(mockClient);
  await repository.deleteAll();

  assertEquals(mockClient.deleteCalls.length, 2);
  assertEquals(mockClient.deleteCalls[0], "codespace-1");
  assertEquals(mockClient.deleteCalls[1], "codespace-2");
});

Deno.test("deleteAll with age filter", async () => {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 10);

  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 1);

  const mockClient = new MockOctokitClient();
  const mockCodespaces = [
    createMockCodespace({
      name: "old-codespace",
      last_used_at: oldDate.toISOString(),
    }),
    createMockCodespace({
      name: "recent-codespace",
      last_used_at: recentDate.toISOString(),
    }),
  ];
  mockClient.setMockCodespaces(mockCodespaces);

  const repository = new GitHubCodespaceRepositoryImpl(mockClient);
  await repository.deleteAll(undefined, 5);

  assertEquals(mockClient.deleteCalls.length, 1);
  assertEquals(mockClient.deleteCalls[0], "old-codespace");
});

Deno.test("GitHubRepositoryError constructor", () => {
  const cause = new Error("Underlying error");
  const error = new GitHubRepositoryError(
    "Test message",
    "testOperation",
    cause,
  );

  assertEquals(error.message, "Test message");
  assertEquals(error.operation, "testOperation");
  assertEquals(error.cause, cause);
  assertEquals(error.name, "GitHubRepositoryError");
});
