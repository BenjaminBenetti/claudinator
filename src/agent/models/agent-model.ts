export enum AgentStatus {
  Active = "active",
  Idle = "idle",
  Running = "running",
  Provisioning = "provisioning",
  Error = "error",
}

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  createdAt: Date;
  codespaceId?: string;
}

export function createAgent(name: string, codespaceId?: string): Agent {
  return {
    id: crypto.randomUUID(),
    name,
    status: AgentStatus.Idle,
    createdAt: new Date(),
    codespaceId,
  };
}

export function createProvisioningAgent(name: string): Agent {
  return {
    id: crypto.randomUUID(),
    name,
    status: AgentStatus.Provisioning,
    createdAt: new Date(),
    codespaceId: undefined,
  };
}

export function isValidAgent(agent: unknown): agent is Agent {
  if (!agent || typeof agent !== "object") {
    return false;
  }

  const obj = agent as Record<string, unknown>;

  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.status === "string" &&
    Object.values(AgentStatus).includes(obj.status as AgentStatus) &&
    obj.createdAt instanceof Date &&
    (obj.codespaceId === undefined || typeof obj.codespaceId === "string")
  );
}
