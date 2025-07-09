export enum AgentStatus {
  Active = 'active',
  Idle = 'idle',
  Running = 'running',
  Error = 'error'
}

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  createdAt: Date;
}

export function createAgent(name: string): Agent {
  return {
    id: crypto.randomUUID(),
    name,
    status: AgentStatus.Idle,
    createdAt: new Date()
  };
}

export function isValidAgent(agent: any): agent is Agent {
  return (
    agent &&
    typeof agent === 'object' &&
    typeof agent.id === 'string' &&
    typeof agent.name === 'string' &&
    typeof agent.status === 'string' &&
    Object.values(AgentStatus).includes(agent.status) &&
    agent.createdAt instanceof Date
  );
}