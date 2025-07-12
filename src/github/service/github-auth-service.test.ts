import { assertEquals, assertRejects, assertThrows } from '@std/assert';
import { GitHubAuthService, GitHubAuthError, createGitHubAuthService } from './github-auth-service.ts';

// Mock Deno.Command for testing
class MockCommand {
  constructor(
    private program: string,
    private options: { args: string[]; stdout: string; stderr: string }
  ) {}

  static mockResults: { [key: string]: { code: number; stdout: string; stderr: string } } = {};

  output() {
    const commandKey = `${this.program} ${this.options.args.join(' ')}`;
    const result = MockCommand.mockResults[commandKey];
    
    if (!result) {
      return Promise.resolve({
        code: 1,
        stdout: new TextEncoder().encode(''),
        stderr: new TextEncoder().encode('Command not found')
      });
    }

    return Promise.resolve({
      code: result.code,
      stdout: new TextEncoder().encode(result.stdout),
      stderr: new TextEncoder().encode(result.stderr)
    });
  }
}

// Store original Deno.Command
const originalCommand = Deno.Command;

Deno.test('GitHubAuthService - getToken success', async () => {
  // Mock successful token retrieval
  MockCommand.mockResults['gh auth token'] = {
    code: 0,
    stdout: 'ghp_test_token_123',
    stderr: ''
  };

  // Replace Deno.Command with mock
  (globalThis as any).Deno.Command = MockCommand;

  try {
    const authService = new GitHubAuthService();
    const token = await authService.getToken();
    
    assertEquals(token, 'ghp_test_token_123');
    
    // Test caching - second call should return same token
    const cachedToken = await authService.getToken();
    assertEquals(cachedToken, 'ghp_test_token_123');
  } finally {
    // Restore original command
    (globalThis as any).Deno.Command = originalCommand;
    MockCommand.mockResults = {};
  }
});

Deno.test('GitHubAuthService - getToken failure', async () => {
  // Mock failed token retrieval
  MockCommand.mockResults['gh auth token'] = {
    code: 1,
    stdout: '',
    stderr: 'Not logged in'
  };

  // Replace Deno.Command with mock
  (globalThis as any).Deno.Command = MockCommand;

  try {
    const authService = new GitHubAuthService();
    
    await assertRejects(
      () => authService.getToken(),
      GitHubAuthError,
      'Failed to get GitHub token from CLI'
    );
  } finally {
    // Restore original command
    (globalThis as any).Deno.Command = originalCommand;
    MockCommand.mockResults = {};
  }
});

Deno.test('GitHubAuthService - getToken empty token', async () => {
  // Mock empty token response
  MockCommand.mockResults['gh auth token'] = {
    code: 0,
    stdout: '',
    stderr: ''
  };

  // Replace Deno.Command with mock
  (globalThis as any).Deno.Command = MockCommand;

  try {
    const authService = new GitHubAuthService();
    
    await assertRejects(
      () => authService.getToken(),
      GitHubAuthError,
      'Empty token received from GitHub CLI'
    );
  } finally {
    // Restore original command
    (globalThis as any).Deno.Command = originalCommand;
    MockCommand.mockResults = {};
  }
});

Deno.test('GitHubAuthService - validateToken success', async () => {
  const authService = new GitHubAuthService();
  
  // Mock Octokit success response
  const originalOctokit = (await import('octokit')).Octokit;
  const mockOctokit = class {
    constructor(options: any) {}
    rest = {
      user: {
        getAuthenticated: () => Promise.resolve({ data: { login: 'testuser' } })
      }
    };
  };
  
  // Replace Octokit temporarily
  const octokitModule = await import('octokit');
  (octokitModule as any).Octokit = mockOctokit;

  try {
    const isValid = await authService.validateToken('valid_token');
    assertEquals(isValid, true);
  } finally {
    // Restore original Octokit
    (octokitModule as any).Octokit = originalOctokit;
  }
});

Deno.test('GitHubAuthService - validateToken failure', async () => {
  const authService = new GitHubAuthService();
  
  // Mock Octokit failure response
  const originalOctokit = (await import('octokit')).Octokit;
  const mockOctokit = class {
    constructor(options: any) {}
    rest = {
      user: {
        getAuthenticated: () => Promise.reject(new Error('Unauthorized'))
      }
    };
  };
  
  // Replace Octokit temporarily
  const octokitModule = await import('octokit');
  (octokitModule as any).Octokit = mockOctokit;

  try {
    const isValid = await authService.validateToken('invalid_token');
    assertEquals(isValid, false);
  } finally {
    // Restore original Octokit
    (octokitModule as any).Octokit = originalOctokit;
  }
});

Deno.test('GitHubAuthService - isAuthenticated success', async () => {
  // Mock successful token and validation
  MockCommand.mockResults['gh auth token'] = {
    code: 0,
    stdout: 'valid_token',
    stderr: ''
  };

  const originalOctokit = (await import('octokit')).Octokit;
  const mockOctokit = class {
    constructor(options: any) {}
    rest = {
      user: {
        getAuthenticated: () => Promise.resolve({ data: { login: 'testuser' } })
      }
    };
  };

  // Replace both mocks
  (globalThis as any).Deno.Command = MockCommand;
  const octokitModule = await import('octokit');
  (octokitModule as any).Octokit = mockOctokit;

  try {
    const authService = new GitHubAuthService();
    const isAuth = await authService.isAuthenticated();
    assertEquals(isAuth, true);
  } finally {
    // Restore originals
    (globalThis as any).Deno.Command = originalCommand;
    (octokitModule as any).Octokit = originalOctokit;
    MockCommand.mockResults = {};
  }
});

Deno.test('GitHubAuthService - isAuthenticated failure', async () => {
  // Mock failed token retrieval
  MockCommand.mockResults['gh auth token'] = {
    code: 1,
    stdout: '',
    stderr: 'Not logged in'
  };

  // Replace Deno.Command with mock
  (globalThis as any).Deno.Command = MockCommand;

  try {
    const authService = new GitHubAuthService();
    const isAuth = await authService.isAuthenticated();
    assertEquals(isAuth, false);
  } finally {
    // Restore original command
    (globalThis as any).Deno.Command = originalCommand;
    MockCommand.mockResults = {};
  }
});

Deno.test('GitHubAuthService - ensureAuthenticated success', async () => {
  // Mock successful token and validation
  MockCommand.mockResults['gh auth token'] = {
    code: 0,
    stdout: 'valid_token',
    stderr: ''
  };

  const originalOctokit = (await import('octokit')).Octokit;
  const mockOctokit = class {
    constructor(options: any) {}
    rest = {
      user: {
        getAuthenticated: () => Promise.resolve({ data: { login: 'testuser' } })
      }
    };
  };

  // Replace both mocks
  (globalThis as any).Deno.Command = MockCommand;
  const octokitModule = await import('octokit');
  (octokitModule as any).Octokit = mockOctokit;

  try {
    const authService = new GitHubAuthService();
    const token = await authService.ensureAuthenticated();
    assertEquals(token, 'valid_token');
  } finally {
    // Restore originals
    (globalThis as any).Deno.Command = originalCommand;
    (octokitModule as any).Octokit = originalOctokit;
    MockCommand.mockResults = {};
  }
});

Deno.test('GitHubAuthService - ensureAuthenticated invalid token', async () => {
  // Mock successful token retrieval but invalid validation
  MockCommand.mockResults['gh auth token'] = {
    code: 0,
    stdout: 'invalid_token',
    stderr: ''
  };

  const originalOctokit = (await import('octokit')).Octokit;
  const mockOctokit = class {
    constructor(options: any) {}
    rest = {
      user: {
        getAuthenticated: () => Promise.reject(new Error('Unauthorized'))
      }
    };
  };

  // Replace both mocks
  (globalThis as any).Deno.Command = MockCommand;
  const octokitModule = await import('octokit');
  (octokitModule as any).Octokit = mockOctokit;

  try {
    const authService = new GitHubAuthService();
    
    await assertRejects(
      () => authService.ensureAuthenticated(),
      GitHubAuthError,
      'GitHub token is invalid'
    );
  } finally {
    // Restore originals
    (globalThis as any).Deno.Command = originalCommand;
    (octokitModule as any).Octokit = originalOctokit;
    MockCommand.mockResults = {};
  }
});

Deno.test('GitHubAuthService - clearCache', async () => {
  // Mock successful token retrieval
  MockCommand.mockResults['gh auth token'] = {
    code: 0,
    stdout: 'test_token',
    stderr: ''
  };

  // Replace Deno.Command with mock
  (globalThis as any).Deno.Command = MockCommand;

  try {
    const authService = new GitHubAuthService();
    
    // Get token (should cache it)
    await authService.getToken();
    
    // Clear cache
    authService.clearCache();
    
    // Getting token again should make new call
    await authService.getToken();
  } finally {
    // Restore original command
    (globalThis as any).Deno.Command = originalCommand;
    MockCommand.mockResults = {};
  }
});

Deno.test('createGitHubAuthService factory function', () => {
  const authService = createGitHubAuthService();
  assertEquals(authService instanceof GitHubAuthService, true);
});

Deno.test('GitHubAuthError constructor', () => {
  const error = new GitHubAuthError('Test message', 'TEST_CODE', 'Test details');
  
  assertEquals(error.message, 'Test message');
  assertEquals(error.code, 'TEST_CODE');
  assertEquals(error.details, 'Test details');
  assertEquals(error.name, 'GitHubAuthError');
});