import { Agent } from "../../../agent/models/agent-model.ts";
import type { ISSHConnectionService } from "../../../ssh/service/ssh-connection-service.ts";
import type { ITerminalService } from "../../../ssh/service/terminal-service.ts";

export enum DisplayMode {
  Details = "details",
  Shell = "shell",
}

export interface AgentTileProps {
  agent: Agent;
  isFocused?: boolean;
  displayMode?: DisplayMode;
  sshConnectionService?: ISSHConnectionService;
  terminalService?: ITerminalService;
}
