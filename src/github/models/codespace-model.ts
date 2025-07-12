import type { Endpoints } from '@octokit/types';

// Use Octokit's built-in types for codespaces
export type Codespace = Endpoints['GET /user/codespaces']['response']['data']['codespaces'][0];
export type CreateCodespaceOptions = Omit<Endpoints['POST /user/codespaces']['parameters'], 'repository_id'>;
export type CodespaceMachine = Endpoints['GET /repos/{owner}/{repo}/codespaces/machines']['response']['data']['machines'][0];