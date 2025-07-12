import type { Endpoints } from '@octokit/types';

type MinimalRepository = Endpoints['GET /user/codespaces']['response']['data']['codespaces'][0]['repository'];
type SimpleUser = Endpoints['GET /user/codespaces']['response']['data']['codespaces'][0]['owner'];

/**
 * Creates a minimal repository object with all required properties for testing
 * @param overrides Partial repository properties to override defaults
 * @returns Complete minimal repository object that satisfies Octokit's schema
 */
export function createMinimalRepository(overrides: Partial<MinimalRepository> = {}): MinimalRepository {
  const owner = overrides.owner?.login || 'test-owner';
  const name = overrides.name || 'test-repo';
  const fullName = overrides.full_name || `${owner}/${name}`;
  const id = overrides.id || 123456;

  return {
    id,
    node_id: `repo-node-${id}`,
    name,
    full_name: fullName,
    owner: createSimpleUser({ login: owner, ...overrides.owner }),
    private: false,
    html_url: `https://github.com/${fullName}`,
    description: null,
    fork: false,
    url: `https://api.github.com/repos/${fullName}`,
    archive_url: `https://api.github.com/repos/${fullName}/{archive_format}{/ref}`,
    assignees_url: `https://api.github.com/repos/${fullName}/assignees{/user}`,
    blobs_url: `https://api.github.com/repos/${fullName}/git/blobs{/sha}`,
    branches_url: `https://api.github.com/repos/${fullName}/branches{/branch}`,
    collaborators_url: `https://api.github.com/repos/${fullName}/collaborators{/collaborator}`,
    comments_url: `https://api.github.com/repos/${fullName}/comments{/number}`,
    commits_url: `https://api.github.com/repos/${fullName}/commits{/sha}`,
    compare_url: `https://api.github.com/repos/${fullName}/compare/{base}...{head}`,
    contents_url: `https://api.github.com/repos/${fullName}/contents/{+path}`,
    contributors_url: `https://api.github.com/repos/${fullName}/contributors`,
    deployments_url: `https://api.github.com/repos/${fullName}/deployments`,
    downloads_url: `https://api.github.com/repos/${fullName}/downloads`,
    events_url: `https://api.github.com/repos/${fullName}/events`,
    forks_url: `https://api.github.com/repos/${fullName}/forks`,
    git_commits_url: `https://api.github.com/repos/${fullName}/git/commits{/sha}`,
    git_refs_url: `https://api.github.com/repos/${fullName}/git/refs{/sha}`,
    git_tags_url: `https://api.github.com/repos/${fullName}/git/tags{/sha}`,
    git_url: `git://github.com/${fullName}.git`,
    issue_comment_url: `https://api.github.com/repos/${fullName}/issues/comments{/number}`,
    issue_events_url: `https://api.github.com/repos/${fullName}/issues/events{/number}`,
    issues_url: `https://api.github.com/repos/${fullName}/issues{/number}`,
    keys_url: `https://api.github.com/repos/${fullName}/keys{/key_id}`,
    labels_url: `https://api.github.com/repos/${fullName}/labels{/name}`,
    languages_url: `https://api.github.com/repos/${fullName}/languages`,
    merges_url: `https://api.github.com/repos/${fullName}/merges`,
    milestones_url: `https://api.github.com/repos/${fullName}/milestones{/number}`,
    notifications_url: `https://api.github.com/repos/${fullName}/notifications{?since,all,participating}`,
    pulls_url: `https://api.github.com/repos/${fullName}/pulls{/number}`,
    releases_url: `https://api.github.com/repos/${fullName}/releases{/id}`,
    ssh_url: `git@github.com:${fullName}.git`,
    stargazers_url: `https://api.github.com/repos/${fullName}/stargazers`,
    statuses_url: `https://api.github.com/repos/${fullName}/statuses/{sha}`,
    subscribers_url: `https://api.github.com/repos/${fullName}/subscribers`,
    subscription_url: `https://api.github.com/repos/${fullName}/subscription`,
    tags_url: `https://api.github.com/repos/${fullName}/tags`,
    teams_url: `https://api.github.com/repos/${fullName}/teams`,
    trees_url: `https://api.github.com/repos/${fullName}/git/trees{/sha}`,
    clone_url: `https://github.com/${fullName}.git`,
    mirror_url: null,
    hooks_url: `https://api.github.com/repos/${fullName}/hooks`,
    svn_url: `https://github.com/${fullName}`,
    homepage: null,
    language: null,
    forks_count: 0,
    stargazers_count: 0,
    watchers_count: 0,
    size: 0,
    default_branch: 'main',
    open_issues_count: 0,
    is_template: false,
    topics: [],
    has_issues: true,
    has_projects: true,
    has_wiki: true,
    has_pages: false,
    has_downloads: true,
    has_discussions: false,
    archived: false,
    disabled: false,
    visibility: 'public',
    pushed_at: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    permissions: {
      admin: false,
      maintain: false,
      push: false,
      triage: false,
      pull: true,
    },
    role_name: 'read',
    temp_clone_token: '',
    delete_branch_on_merge: false,
    subscribers_count: 0,
    network_count: 0,
    code_of_conduct: undefined,
    license: null,
    forks: 0,
    open_issues: 0,
    watchers: 0,
    allow_forking: true,
    web_commit_signoff_required: false,
    security_and_analysis: null,
    ...overrides,
  };
}

/**
 * Creates a simple user object with all required properties for testing
 * @param overrides Partial user properties to override defaults
 * @returns Complete simple user object that satisfies Octokit's schema
 */
export function createSimpleUser(overrides: Partial<SimpleUser> = {}): SimpleUser {
  const login = overrides.login || 'test-user';
  const id = overrides.id || 12345;

  return {
    name: null,
    email: null,
    login,
    id,
    node_id: `user-node-${id}`,
    avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
    gravatar_id: null,
    url: `https://api.github.com/users/${login}`,
    html_url: `https://github.com/${login}`,
    followers_url: `https://api.github.com/users/${login}/followers`,
    following_url: `https://api.github.com/users/${login}/following{/other_user}`,
    gists_url: `https://api.github.com/users/${login}/gists{/gist_id}`,
    starred_url: `https://api.github.com/users/${login}/starred{/owner}{/repo}`,
    subscriptions_url: `https://api.github.com/users/${login}/subscriptions`,
    organizations_url: `https://api.github.com/users/${login}/orgs`,
    repos_url: `https://api.github.com/users/${login}/repos`,
    events_url: `https://api.github.com/users/${login}/events{/privacy}`,
    received_events_url: `https://api.github.com/users/${login}/received_events`,
    type: 'User',
    user_view_type: 'public',
    site_admin: false,
    ...overrides,
  };
}