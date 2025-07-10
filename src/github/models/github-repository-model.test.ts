import { assertEquals } from '@std/assert';
import type { GitHubRepository } from './github-repository-model.ts';

Deno.test('GitHubRepository interface validation', () => {
  const mockRepository: GitHubRepository = {
    owner: 'test-owner',
    name: 'test-repo',
    fullName: 'test-owner/test-repo',
    defaultBranch: 'main'
  };

  assertEquals(mockRepository.owner, 'test-owner');
  assertEquals(mockRepository.name, 'test-repo');
  assertEquals(mockRepository.fullName, 'test-owner/test-repo');
  assertEquals(mockRepository.defaultBranch, 'main');
});

Deno.test('GitHubRepository without optional fields', () => {
  const minimalRepository: GitHubRepository = {
    owner: 'test-owner',
    name: 'test-repo',
    fullName: 'test-owner/test-repo'
  };

  assertEquals(minimalRepository.owner, 'test-owner');
  assertEquals(minimalRepository.name, 'test-repo');
  assertEquals(minimalRepository.fullName, 'test-owner/test-repo');
  assertEquals(minimalRepository.defaultBranch, undefined);
});

Deno.test('GitHubRepository fullName format consistency', () => {
  const repository: GitHubRepository = {
    owner: 'microsoft',
    name: 'vscode',
    fullName: 'microsoft/vscode'
  };

  assertEquals(repository.fullName, `${repository.owner}/${repository.name}`);
});