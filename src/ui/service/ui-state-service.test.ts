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
  assertEquals(service.getFocusArea(), FocusArea.Tile);
  
  // Tile -> Sidebar (single tile doesn't go to tile focus)
  service.cycleFocus(1);
  assertEquals(service.getFocusArea(), FocusArea.Sidebar);
});

Deno.test("Unit - UIStateService should cycle focus with multiple tiles", () => {
  const service = createUIStateService();
  
  // Sidebar -> MainContent
  service.cycleFocus(2);
  assertEquals(service.getFocusArea(), FocusArea.Tile);
  
  // MainContent -> Tile
  service.cycleFocus(2);
  assertEquals(service.getFocusArea(), FocusArea.Sidebar);
  
  // Tile -> Sidebar
  service.cycleFocus(2);
  assertEquals(service.getFocusArea(), FocusArea.Tile);
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

