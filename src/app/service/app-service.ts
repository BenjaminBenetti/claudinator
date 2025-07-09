import { SignalHandler } from "../../cli/service/signal-handler-service.ts";
import { createInkService } from "../../ui/service/ink-service.ts";
import { AppContainer } from "../../ui/components/app-container.tsx";
import { createAgentService } from "../../agent/service/agent-service.ts";
import { createAgentRepository } from "../../agent/repo/agent-repo.ts";
import { createUIStateService } from "../../ui/service/ui-state-service.ts";
import React from "react";

export class AppService {
  // =========================================================================
  // Private Properties
  // =========================================================================
  
  private signalHandler: SignalHandler;
  private isRunning = false;
  private inkService: any;
  private agentService: any;
  private uiStateService: any;

  // =========================================================================
  // Constructor
  // =========================================================================

  constructor(signalHandler: SignalHandler) {
    this.signalHandler = signalHandler;
    this.inkService = createInkService(signalHandler);
    
    // Initialize services
    const agentRepository = createAgentRepository();
    this.agentService = createAgentService(agentRepository);
    this.uiStateService = createUIStateService();
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  public async run(): Promise<void> {
    this.isRunning = true;
    
    try {
      const appComponent = React.createElement(AppContainer, {
        agentService: this.agentService,
        uiStateService: this.uiStateService
      });
      
      await this.inkService.start(appComponent);
    } catch (error) {
      if (!this.signalHandler.isShutdown) {
        console.error("Error in application:", error);
      }
    } finally {
      this.isRunning = false;
    }
  }

  public cleanup(): void {
    this.isRunning = false;
    this.inkService.cleanup();
  }

  // =========================================================================
  // Getters
  // =========================================================================

  public get running(): boolean {
    return this.isRunning;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================
}

export function createAppService(signalHandler: SignalHandler): AppService {
  return new AppService(signalHandler);
}