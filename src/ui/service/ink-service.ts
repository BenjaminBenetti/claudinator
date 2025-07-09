import { render } from "ink";
import React from "react";
import { SignalHandler } from "../../cli/service/signal-handler-service.ts";

export class InkService {
  // =========================================================================
  // Private Properties
  // =========================================================================
  
  private signalHandler: SignalHandler;
  private isRunning = false;

  // =========================================================================
  // Constructor
  // =========================================================================

  constructor(signalHandler: SignalHandler) {
    this.signalHandler = signalHandler;
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  public async start(component: React.ReactElement): Promise<void> {
    this.isRunning = true;
    
    try {
      const { waitUntilExit } = render(component);
      await waitUntilExit();
    } finally {
      this.isRunning = false;
    }
  }

  public cleanup(): void {
    this.isRunning = false;
  }

  // =========================================================================
  // Getters
  // =========================================================================

  public get running(): boolean {
    return this.isRunning;
  }
}

export function createInkService(signalHandler: SignalHandler): InkService {
  return new InkService(signalHandler);
}