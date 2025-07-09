import { assertEquals } from "@std/assert";
import React from "react";
import TestRenderer from "react-test-renderer";
import { TileContainer, TileContainerRef } from "./tile-container.tsx";
import { Text } from "ink";

const mockChildren = [
  React.createElement(Text, { key: "1" }, "Content 1"),
  React.createElement(Text, { key: "2" }, "Content 2"),
  React.createElement(Text, { key: "3" }, "Content 3")
];

Deno.test("Unit - TileContainer should render without crashing", async () => {
  const component = TestRenderer.create(
    <TileContainer>{mockChildren}</TileContainer>
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - TileContainer should render empty message when no children", async () => {
  const component = TestRenderer.create(
    <TileContainer emptyMessage="No agents selected">{[]}</TileContainer>
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  // Check that the empty message is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("No agents selected"), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - TileContainer should render single child without tiles", async () => {
  const singleChild = [React.createElement(Text, { key: "1" }, "Single Content")];
  
  const component = TestRenderer.create(
    <TileContainer>{singleChild}</TileContainer>
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  // Check that the single content is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Single Content"), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - TileContainer should render multiple children in tiles", async () => {
  const component = TestRenderer.create(
    <TileContainer>{mockChildren}</TileContainer>
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  // Check that multiple content items are rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Content 1"), true);
  assertEquals(jsonString.includes("Content 2"), true);
  assertEquals(jsonString.includes("Content 3"), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - TileContainer should apply custom border style", async () => {
  const component = TestRenderer.create(
    <TileContainer 
      borderStyle="double"
      borderColor="blue"
    >{mockChildren}</TileContainer>
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  // Check that border properties are applied
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes('"borderStyle":"double"'), true);
  assertEquals(jsonString.includes('"borderColor":"blue"'), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - TileContainer should handle custom empty message", async () => {
  const customMessage = "Custom empty message";
  
  const component = TestRenderer.create(
    <TileContainer emptyMessage={customMessage}>{[]}</TileContainer>
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  
  // Check that the custom empty message is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes(customMessage), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - TileContainer should handle focused tile index", async () => {
  const component = TestRenderer.create(
    <TileContainer 
      focusedTileIndex={1}
    >{mockChildren}</TileContainer>
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  // Check that focus is applied (blue border for focused tile)
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes('"borderColor":"blue"'), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - TileContainer should handle different numbers of children", async () => {
  // Test with 2 children
  const twoChildren = [
    React.createElement(Text, { key: "1" }, "Content 1"),
    React.createElement(Text, { key: "2" }, "Content 2")
  ];
  const component2 = TestRenderer.create(
    <TileContainer>{twoChildren}</TileContainer>
  );
  const tree2 = component2.toJSON();
  assertEquals(tree2 !== null, true);
  
  const jsonString2 = JSON.stringify(tree2);
  assertEquals(jsonString2.includes("Content 1"), true);
  assertEquals(jsonString2.includes("Content 2"), true);
  component2.unmount();
  
  // Test with 4 children
  const fourChildren = [
    React.createElement(Text, { key: "1" }, "Content 1"),
    React.createElement(Text, { key: "2" }, "Content 2"),
    React.createElement(Text, { key: "3" }, "Content 3"),
    React.createElement(Text, { key: "4" }, "Content 4")
  ];
  const component4 = TestRenderer.create(
    <TileContainer>{fourChildren}</TileContainer>
  );
  const tree4 = component4.toJSON();
  assertEquals(tree4 !== null, true);
  
  const jsonString4 = JSON.stringify(tree4);
  assertEquals(jsonString4.includes("Content 1"), true);
  assertEquals(jsonString4.includes("Content 4"), true);
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
    <TileContainer>{fiveChildren}</TileContainer>
  );
  const tree5 = component5.toJSON();
  assertEquals(tree5 !== null, true);
  
  const jsonString5 = JSON.stringify(tree5);
  assertEquals(jsonString5.includes("Content 1"), true);
  assertEquals(jsonString5.includes("Content 5"), true);
  component5.unmount();
  
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - TileContainer should handle edge case with zero focused index", async () => {
  const component = TestRenderer.create(
    <TileContainer 
      focusedTileIndex={0}
    >{mockChildren}</TileContainer>
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  // Check that focus is applied to first tile (blue border)
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes('"borderColor":"blue"'), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - TileContainer should have proper container structure", async () => {
  const component = TestRenderer.create(
    <TileContainer>{mockChildren}</TileContainer>
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  // Check that container has proper structure with flexDirection column
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes('"flexDirection":"column"'), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - TileContainer should handle navigation via ref", async () => {
  let focusedIndex = 0;
  const handleTileFocus = (index: number) => {
    focusedIndex = index;
  };

  const ref = React.createRef<TileContainerRef>();
  const component = TestRenderer.create(
    <TileContainer 
      ref={ref}
      focusedTileIndex={focusedIndex}
      onTileFocus={handleTileFocus}
    >
      {mockChildren}
    </TileContainer>
  );

  // Test that the navigation method is available
  assertEquals(ref.current !== null, true);
  assertEquals(typeof ref.current?.navigateTile, "function");

  // Test navigation (note: the actual navigation logic depends on layout calculation)
  if (ref.current) {
    ref.current.navigateTile('right');
    // Since navigation depends on layout calculation and we can't easily mock terminal dimensions,
    // we'll just verify the method can be called without error
  }

  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});