import { assertEquals } from "@std/assert";
import React from "react";
import TestRenderer from "react-test-renderer";
import { TileContainer } from "./tile-container.tsx";
import { Text } from "ink";

const mockChildren = [
  React.createElement(Text, { key: "1" }, "Content 1"),
  React.createElement(Text, { key: "2" }, "Content 2"),
  React.createElement(Text, { key: "3" }, "Content 3")
];

Deno.test("Unit - TileContainer should render without crashing", () => {
  const component = TestRenderer.create(
    <TileContainer children={mockChildren} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - TileContainer should render empty message when no children", () => {
  const component = TestRenderer.create(
    <TileContainer children={[]} emptyMessage="No agents selected" />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  
  if (tree && typeof tree === 'object' && 'props' in tree) {
    assertEquals(tree.props?.flexDirection, 'column');
    assertEquals(tree.props?.alignItems, 'center');
    assertEquals(tree.props?.justifyContent, 'center');
  }
  
  component.unmount();
});

Deno.test("Unit - TileContainer should render single child without tiles", () => {
  const singleChild = [React.createElement(Text, { key: "1" }, "Single Content")];
  
  const component = TestRenderer.create(
    <TileContainer children={singleChild} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  
  if (tree && typeof tree === 'object' && 'props' in tree) {
    assertEquals(tree.props?.borderStyle, 'round');
    assertEquals(tree.props?.borderColor, 'gray');
  }
  
  component.unmount();
});

Deno.test("Unit - TileContainer should render multiple children in tiles", () => {
  const component = TestRenderer.create(
    <TileContainer children={mockChildren} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  
  if (tree && typeof tree === 'object' && 'props' in tree) {
    assertEquals(tree.props?.flexDirection, 'column');
    assertEquals(tree.props?.borderStyle, 'round');
    assertEquals(tree.props?.borderColor, 'gray');
  }
  
  component.unmount();
});

Deno.test("Unit - TileContainer should apply custom border style", () => {
  const component = TestRenderer.create(
    <TileContainer 
      children={mockChildren} 
      borderStyle="double"
      borderColor="blue"
    />
  );
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'props' in tree) {
    assertEquals(tree.props?.borderStyle, 'double');
    assertEquals(tree.props?.borderColor, 'blue');
  }
  
  component.unmount();
});

Deno.test("Unit - TileContainer should handle custom empty message", () => {
  const customMessage = "Custom empty message";
  
  const component = TestRenderer.create(
    <TileContainer children={[]} emptyMessage={customMessage} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - TileContainer should handle focused tile index", () => {
  const component = TestRenderer.create(
    <TileContainer 
      children={mockChildren} 
      focusedTileIndex={1}
    />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - TileContainer should handle different numbers of children", () => {
  // Test with 2 children
  const twoChildren = [
    React.createElement(Text, { key: "1" }, "Content 1"),
    React.createElement(Text, { key: "2" }, "Content 2")
  ];
  const component2 = TestRenderer.create(
    <TileContainer children={twoChildren} />
  );
  const tree2 = component2.toJSON();
  assertEquals(tree2 !== null, true);
  component2.unmount();
  
  // Test with 4 children
  const fourChildren = [
    React.createElement(Text, { key: "1" }, "Content 1"),
    React.createElement(Text, { key: "2" }, "Content 2"),
    React.createElement(Text, { key: "3" }, "Content 3"),
    React.createElement(Text, { key: "4" }, "Content 4")
  ];
  const component4 = TestRenderer.create(
    <TileContainer children={fourChildren} />
  );
  const tree4 = component4.toJSON();
  assertEquals(tree4 !== null, true);
  component4.unmount();
  
  // Test with 5 children
  const fiveChildren = [
    React.createElement(Text, { key: "1" }, "Content 1"),
    React.createElement(Text, { key: "2" }, "Content 2"),
    React.createElement(Text, { key: "3" }, "Content 3"),
    React.createElement(Text, { key: "4" }, "Content 4"),
    React.createElement(Text, { key: "5" }, "Content 5")
  ];
  const component5 = TestRenderer.create(
    <TileContainer children={fiveChildren} />
  );
  const tree5 = component5.toJSON();
  assertEquals(tree5 !== null, true);
  component5.unmount();
});

Deno.test("Unit - TileContainer should handle edge case with zero focused index", () => {
  const component = TestRenderer.create(
    <TileContainer 
      children={mockChildren} 
      focusedTileIndex={0}
    />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - TileContainer should have proper container structure", () => {
  const component = TestRenderer.create(
    <TileContainer children={mockChildren} />
  );
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'type' in tree) {
    assertEquals(tree.type, 'ink-box');
  }
  
  component.unmount();
});