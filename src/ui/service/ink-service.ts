import { render } from "ink";
import React from "react";
import { SignalHandler } from "../../cli/service/signal-handler-service.ts";

export class InkService {
  // =========================================================================
  // Private Properties
  // =========================================================================
  
  private signalHandler: SignalHandler;
  private isRunning = false;
  private currentInstance: any = null;

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
      const { waitUntilExit, unmount } = render(component);
      this.currentInstance = { waitUntilExit, unmount };
      await waitUntilExit();
    } finally {
      this.isRunning = false;
      this.currentInstance = null;
    }
  }

  public cleanup(): void {
    this.isRunning = false;
    if (this.currentInstance && this.currentInstance.unmount) {
      this.currentInstance.unmount();
      this.currentInstance = null;
    }
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