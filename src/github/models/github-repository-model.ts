export interface GitHubRepository {
  owner: string;
  name: string;
  fullName: string; // owner/name format
  defaultBranch?: string;
}