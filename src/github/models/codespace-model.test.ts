import { assertEquals } from '@std/assert';
import type { Codespace, CreateCodespaceOptions, CodespaceMachine } from './codespace-model.ts';

Deno.test('Codespace type is properly imported from Octokit', () => {
  // Test that we can create a partial codespace object with Octokit types
  const partialCodespace: Partial<Codespace> = {
    name: 'test-codespace-123',
    state: 'Available'
  };

  assertEquals(partialCodespace.name, 'test-codespace-123');
  assertEquals(partialCodespace.state, 'Available');
});

Deno.test('CreateCodespaceOptions type is properly imported from Octokit', () => {
  // Test that we can use Octokit's CreateCodespaceOptions
  const options: CreateCodespaceOptions = {
    ref: 'main',
    machine: 'basicLinux32gb'
  };

  assertEquals(options.ref, 'main');
  assertEquals(options.machine, 'basicLinux32gb');
});

Deno.test('CodespaceMachine type is properly imported from Octokit', () => {
  // Test that we can create a partial machine object
  const partialMachine: Partial<CodespaceMachine> = {
    name: 'basicLinux32gb',
    display_name: 'Basic (2 cores, 8 GB RAM, 32 GB storage)'
  };

  assertEquals(partialMachine.name, 'basicLinux32gb');
  assertEquals(partialMachine.display_name, 'Basic (2 cores, 8 GB RAM, 32 GB storage)');
});