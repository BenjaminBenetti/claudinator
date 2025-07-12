import { Agent } from "../../../agent/models/agent-model.ts";

export enum DisplayMode {
  Details = "details",
  Shell = "shell",
}

export interface AgentTileProps {
  agent: Agent;
  isFocused?: boolean;
}
