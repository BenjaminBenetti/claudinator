import { assertEquals } from "@std/assert";
import { UIStateService, FocusArea, createUIStateService } from "./ui-state-service.ts";

Deno.test("Unit - UIStateService should initialize with sidebar focus", () => {
  const service = createUIStateService();
  
  assertEquals(service.getFocusArea(), FocusArea.Sidebar);
  assertEquals(service.getSelectedListIndex(), 0);
  assertEquals(service.getFocusedTileIndex(), 0);
});

Deno.test("Unit - UIStateService should set focus area", () => {
  const service = createUIStateService();
  
  service.setFocusArea(FocusArea.MainContent);
  assertEquals(service.getFocusArea(), FocusArea.MainContent);
  
  service.setFocusArea(FocusArea.Tile);
  assertEquals(service.getFocusArea(), FocusArea.Tile);
});

Deno.test("Unit - UIStateService should cycle focus with no tiles", () => {
  const service = createUIStateService();
  
  // Start at sidebar
  assertEquals(service.getFocusArea(), FocusArea.Sidebar);
  
  // Should stay at sidebar when no tiles
  service.cycleFocus(0);
  assertEquals(service.getFocusArea(), FocusArea.Sidebar);
});

Deno.test("Unit - UIStateService should cycle focus with one tile", () => {
  const service = createUIStateService();
  
  // Sidebar -> MainContent
  service.cycleFocus(1);
  assertEquals(service.getFocusArea(), FocusArea.MainContent);
  
  // MainContent -> Sidebar (single tile doesn't go to tile focus)
  service.cycleFocus(1);
  assertEquals(service.getFocusArea(), FocusArea.Sidebar);
});

Deno.test("Unit - UIStateService should cycle focus with multiple tiles", () => {
  const service = createUIStateService();
  
  // Sidebar -> MainContent
  service.cycleFocus(2);
  assertEquals(service.getFocusArea(), FocusArea.MainContent);
  
  // MainContent -> Tile
  service.cycleFocus(2);
  assertEquals(service.getFocusArea(), FocusArea.Tile);
  
  // Tile -> Sidebar
  service.cycleFocus(2);
  assertEquals(service.getFocusArea(), FocusArea.Sidebar);
});

Deno.test("Unit - UIStateService should handle list selection", () => {
  const service = createUIStateService();
  
  service.setSelectedListIndex(5);
  assertEquals(service.getSelectedListIndex(), 5);
  
  // Should not allow negative indices
  service.setSelectedListIndex(-1);
  assertEquals(service.getSelectedListIndex(), 0);
});

Deno.test("Unit - UIStateService should move list selection up", () => {
  const service = createUIStateService();
  
  service.setSelectedListIndex(2);
  service.moveListSelection('up', 5);
  assertEquals(service.getSelectedListIndex(), 1);
  
  // Should wrap to bottom
  service.setSelectedListIndex(0);
  service.moveListSelection('up', 5);
  assertEquals(service.getSelectedListIndex(), 4);
});

Deno.test("Unit - UIStateService should move list selection down", () => {
  const service = createUIStateService();
  
  service.setSelectedListIndex(2);
  service.moveListSelection('down', 5);
  assertEquals(service.getSelectedListIndex(), 3);
  
  // Should wrap to top
  service.setSelectedListIndex(4);
  service.moveListSelection('down', 5);
  assertEquals(service.getSelectedListIndex(), 0);
});

Deno.test("Unit - UIStateService should handle empty list navigation", () => {
  const service = createUIStateService();
  
  service.moveListSelection('up', 0);
  assertEquals(service.getSelectedListIndex(), 0);
  
  service.moveListSelection('down', 0);
  assertEquals(service.getSelectedListIndex(), 0);
});

Deno.test("Unit - UIStateService should handle tile focus", () => {
  const service = createUIStateService();
  
  service.setFocusedTileIndex(3);
  assertEquals(service.getFocusedTileIndex(), 3);
  
  // Should not allow negative indices
  service.setFocusedTileIndex(-1);
  assertEquals(service.getFocusedTileIndex(), 0);
});

Deno.test("Unit - UIStateService should move tile focus", () => {
  const service = createUIStateService();
  const layout = { columns: 2, rows: 2, tileWidth: 100, tileHeight: 100 };
  
  // Start at index 0 (top-left)
  service.setFocusedTileIndex(0);
  
  // Move right
  service.moveTileFocus('right', layout, 4);
  assertEquals(service.getFocusedTileIndex(), 1);
  
  // Move down
  service.moveTileFocus('down', layout, 4);
  assertEquals(service.getFocusedTileIndex(), 3);
  
  // Move left
  service.moveTileFocus('left', layout, 4);
  assertEquals(service.getFocusedTileIndex(), 2);
  
  // Move up
  service.moveTileFocus('up', layout, 4);
  assertEquals(service.getFocusedTileIndex(), 0);
});

Deno.test("Unit - UIStateService should wrap tile focus", () => {
  const service = createUIStateService();
  const layout = { columns: 2, rows: 2, tileWidth: 100, tileHeight: 100 };
  
  // Test wrapping at edges
  service.setFocusedTileIndex(0);
  
  // Move left should wrap to right
  service.moveTileFocus('left', layout, 4);
  assertEquals(service.getFocusedTileIndex(), 1);
  
  // Move up should wrap to bottom
  service.setFocusedTileIndex(0);
  service.moveTileFocus('up', layout, 4);
  assertEquals(service.getFocusedTileIndex(), 2);
});

Deno.test("Unit - UIStateService should calculate tile layout for single tile", () => {
  const service = createUIStateService();
  
  const layout = service.calculateTileLayout(100, 200, 1);
  
  assertEquals(layout.columns, 1);
  assertEquals(layout.rows, 1);
  assertEquals(layout.tileWidth, 100);
  assertEquals(layout.tileHeight, 200);
});

Deno.test("Unit - UIStateService should calculate tile layout for two tiles", () => {
  const service = createUIStateService();
  
  const layout = service.calculateTileLayout(100, 200, 2);
  
  assertEquals(layout.columns, 2);
  assertEquals(layout.rows, 1);
  assertEquals(layout.tileWidth, 50);
  assertEquals(layout.tileHeight, 200);
});

Deno.test("Unit - UIStateService should calculate tile layout for four tiles", () => {
  const service = createUIStateService();
  
  const layout = service.calculateTileLayout(100, 200, 4);
  
  assertEquals(layout.columns, 2);
  assertEquals(layout.rows, 2);
  assertEquals(layout.tileWidth, 50);
  assertEquals(layout.tileHeight, 100);
});

Deno.test("Unit - UIStateService should calculate tile layout for five tiles", () => {
  const service = createUIStateService();
  
  const layout = service.calculateTileLayout(120, 120, 5);
  
  assertEquals(layout.columns, 3);
  assertEquals(layout.rows, 2);
  assertEquals(layout.tileWidth, 40);
  assertEquals(layout.tileHeight, 60);
});

Deno.test("Unit - UIStateService should calculate tile layout for nine tiles", () => {
  const service = createUIStateService();
  
  const layout = service.calculateTileLayout(120, 120, 9);
  
  assertEquals(layout.columns, 3);
  assertEquals(layout.rows, 3);
  assertEquals(layout.tileWidth, 40);
  assertEquals(layout.tileHeight, 40);
});

Deno.test("Unit - UIStateService should reset state", () => {
  const service = createUIStateService();
  
  // Set some state
  service.setFocusArea(FocusArea.Tile);
  service.setSelectedListIndex(5);
  service.setFocusedTileIndex(3);
  
  // Reset
  service.resetState();
  
  assertEquals(service.getFocusArea(), FocusArea.Sidebar);
  assertEquals(service.getSelectedListIndex(), 0);
  assertEquals(service.getFocusedTileIndex(), 0);
});

Deno.test("Unit - UIStateService should handle zero tiles in layout", () => {
  const service = createUIStateService();
  
  const layout = service.calculateTileLayout(100, 100, 0);
  
  assertEquals(layout.columns, 1);
  assertEquals(layout.rows, 1);
  assertEquals(layout.tileWidth, 100);
  assertEquals(layout.tileHeight, 100);
});

Deno.test("Unit - UIStateService should handle tile focus with zero tiles", () => {
  const service = createUIStateService();
  const layout = { columns: 1, rows: 1, tileWidth: 100, tileHeight: 100 };
  
  service.moveTileFocus('right', layout, 0);
  assertEquals(service.getFocusedTileIndex(), 0);
});