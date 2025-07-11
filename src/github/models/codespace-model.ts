export type GitHubMachineType = 'basicLinux32gb' | 'standardLinux32gb' | 'premiumLinux' | 'largePremiumLinux';

export interface Codespace {
  name: string;
  displayName: string;
  repository: string;
  owner: string;
  branch: string;
  state: CodespaceState;
  machineType: string;
  createdAt: Date;
  lastUsedAt: Date;
  url?: string;
  gitStatus?: string;
}

export type CodespaceState = 'Available' | 'Shutdown' | 'Starting' | 'Rebuilding' | 'Error';

export interface CreateCodespaceOptions {
  repository: string;
  branch?: string;
  machineType?: GitHubMachineType;
  retentionPeriod?: number;
}