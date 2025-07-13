import { DisplayMode } from "../components/agent-tile/types.ts";

export enum FocusArea {
  Sidebar = "sidebar",
  Tile = "tile",
}

export class UIStateService {
  private currentFocus: FocusArea = FocusArea.Sidebar;
  private selectedListIndex: number = 0;
  private focusedTileIndex: number = 0;
  private errorModalVisible: boolean = false;
  private errorModalMessage: string = "";
  private tileDisplayModes: Map<string, DisplayMode> = new Map();

  public getFocusArea(): FocusArea {
    return this.currentFocus;
  }

  public setFocusArea(area: FocusArea): void {
    this.currentFocus = area;
  }

  public cycleFocus(totalTiles: number): void {
    switch (this.currentFocus) {
      case FocusArea.Sidebar:
        if (totalTiles > 0) {
          this.currentFocus = FocusArea.Tile;
        }
        break;
      case FocusArea.Tile:
        this.currentFocus = FocusArea.Sidebar;
        break;
    }
  }

  public getSelectedListIndex(): number {
    return this.selectedListIndex;
  }

  public setSelectedListIndex(index: number): void {
    this.selectedListIndex = Math.max(0, index);
  }

  public moveListSelection(direction: "up" | "down", totalItems: number): void {
    if (totalItems === 0) return;

    if (direction === "up") {
      this.selectedListIndex = this.selectedListIndex > 0
        ? this.selectedListIndex - 1
        : totalItems - 1;
    } else {
      this.selectedListIndex = this.selectedListIndex < totalItems - 1
        ? this.selectedListIndex + 1
        : 0;
    }
  }

  public getFocusedTileIndex(): number {
    return this.focusedTileIndex;
  }

  public setFocusedTileIndex(index: number): void {
    this.focusedTileIndex = Math.max(0, index);
  }

  public showErrorModal(message: string): void {
    this.errorModalMessage = message;
    this.errorModalVisible = true;
  }

  public hideErrorModal(): void {
    this.errorModalVisible = false;
    this.errorModalMessage = "";
  }

  public isErrorModalVisible(): boolean {
    return this.errorModalVisible;
  }

  public getErrorModalMessage(): string {
    return this.errorModalMessage;
  }

  /**
   * Gets the display mode for a specific agent tile.
   *
   * @param agentId - ID of the agent
   * @returns Display mode for the agent (defaults to Details)
   */
  public getTileDisplayMode(agentId: string): DisplayMode {
    return this.tileDisplayModes.get(agentId) || DisplayMode.Details;
  }

  /**
   * Sets the display mode for a specific agent tile.
   *
   * @param agentId - ID of the agent
   * @param mode - Display mode to set
   */
  public setTileDisplayMode(agentId: string, mode: DisplayMode): void {
    this.tileDisplayModes.set(agentId, mode);
  }

  /**
   * Toggles between Details and Shell mode for a specific agent tile.
   *
   * @param agentId - ID of the agent
   * @returns The new display mode
   */
  public toggleTileDisplayMode(agentId: string): DisplayMode {
    const currentMode = this.getTileDisplayMode(agentId);
    const newMode = currentMode === DisplayMode.Details
      ? DisplayMode.Shell
      : DisplayMode.Details;
    this.setTileDisplayMode(agentId, newMode);
    return newMode;
  }

  /**
   * Removes the display mode state for an agent (cleanup when agent is removed).
   *
   * @param agentId - ID of the agent
   */
  public removeTileDisplayMode(agentId: string): void {
    this.tileDisplayModes.delete(agentId);
  }

  public resetState(): void {
    this.currentFocus = FocusArea.Sidebar;
    this.selectedListIndex = 0;
    this.focusedTileIndex = 0;
    this.errorModalVisible = false;
    this.errorModalMessage = "";
    this.tileDisplayModes.clear();
  }
}

export function createUIStateService(): UIStateService {
  return new UIStateService();
}
