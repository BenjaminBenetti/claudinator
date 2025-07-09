export enum FocusArea {
  Sidebar = 'sidebar',
  Tile = 'tile'
}

export class UIStateService {
  private currentFocus: FocusArea = FocusArea.Sidebar;
  private selectedListIndex: number = 0;
  private focusedTileIndex: number = 0;

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

  public moveListSelection(direction: 'up' | 'down', totalItems: number): void {
    if (totalItems === 0) return;

    if (direction === 'up') {
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

  public resetState(): void {
    this.currentFocus = FocusArea.Sidebar;
    this.selectedListIndex = 0;
    this.focusedTileIndex = 0;
  }
}

export function createUIStateService(): UIStateService {
  return new UIStateService();
}