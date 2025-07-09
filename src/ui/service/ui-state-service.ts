export enum FocusArea {
  Sidebar = 'sidebar',
  MainContent = 'main-content',
  Tile = 'tile'
}

export interface TileLayout {
  columns: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
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
        this.currentFocus = totalTiles > 1 ? FocusArea.Tile : FocusArea.Sidebar;
        break;
      case FocusArea.MainContent:
        this.currentFocus = FocusArea.Sidebar;
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

  public moveTileFocus(direction: 'up' | 'down' | 'left' | 'right', layout: TileLayout, totalTiles: number): void {
    if (totalTiles === 0) return;

    const currentRow = Math.floor(this.focusedTileIndex / layout.columns);
    const currentCol = this.focusedTileIndex % layout.columns;
    
    let newRow = currentRow;
    let newCol = currentCol;
    
    switch (direction) {
      case 'up':
        newRow = currentRow > 0 ? currentRow - 1 : layout.rows - 1;
        break;
      case 'down':
        newRow = currentRow < layout.rows - 1 ? currentRow + 1 : 0;
        break;
      case 'left':
        newCol = currentCol > 0 ? currentCol - 1 : layout.columns - 1;
        break;
      case 'right':
        newCol = currentCol < layout.columns - 1 ? currentCol + 1 : 0;
        break;
    }
    
    const newIndex = newRow * layout.columns + newCol;
    
    if (newIndex < totalTiles) {
      this.focusedTileIndex = newIndex;
    }
  }

  public calculateTileLayout(containerWidth: number, containerHeight: number, tileCount: number): TileLayout {
    if (tileCount === 0) {
      return { columns: 1, rows: 1, tileWidth: containerWidth - 2, tileHeight: containerHeight - 2 };
    }

    if (tileCount === 1) {
      return { columns: 1, rows: 1, tileWidth: containerWidth - 2, tileHeight: containerHeight - 2 };
    }

    if (tileCount === 2) {
      // For 2 tiles side by side, account for: container padding (2), tile borders (4), margin between tiles (1)
      const availableWidth = containerWidth - 2 - 4 - 1; // -2 for container padding, -4 for tile borders, -1 for margin
      return { 
        columns: 2, 
        rows: 1, 
        tileWidth: Math.floor(availableWidth / 2), 
        tileHeight: containerHeight - 2 - 2 // -2 for container padding, -2 for tile borders
      };
    }

    if (tileCount <= 4) {
      // For 4 tiles in 2x2 grid
      const availableWidth = containerWidth - 2 - 4 - 1; // -2 for container padding, -4 for tile borders, -1 for margin
      const availableHeight = containerHeight - 2 - 4 - 1; // -2 for container padding, -4 for tile borders, -1 for margin
      return { 
        columns: 2, 
        rows: 2, 
        tileWidth: Math.floor(availableWidth / 2), 
        tileHeight: Math.floor(availableHeight / 2)
      };
    }

    const columns = Math.ceil(Math.sqrt(tileCount));
    const rows = Math.ceil(tileCount / columns);
    
    // Calculate available space accounting for borders and margins
    const horizontalOverhead = 2 + (columns * 2) + (columns - 1); // container padding + tile borders + margins
    const verticalOverhead = 2 + (rows * 2) + (rows - 1); // container padding + tile borders + margins
    const availableWidth = containerWidth - horizontalOverhead;
    const availableHeight = containerHeight - verticalOverhead;

    return {
      columns,
      rows,
      tileWidth: Math.floor(availableWidth / columns),
      tileHeight: Math.floor(availableHeight / rows)
    };
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