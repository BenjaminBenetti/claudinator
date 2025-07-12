import React, { useEffect, useImperativeHandle, useState } from "react";
import { Box, Text, useStdout } from "ink";

export interface TileLayout {
  columns: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
}

interface TileContainerProps {
  children: React.ReactNode;
  borderStyle?:
    | "single"
    | "double"
    | "round"
    | "bold"
    | "singleDouble"
    | "doubleSingle"
    | "classic";
  borderColor?: string;
  emptyMessage?: string;
  focusedTileIndex?: number;
  onTileFocus?: (index: number) => void;
  onTileNavigation?: (direction: "up" | "down" | "left" | "right") => void;
}

export interface TileContainerRef {
  navigateTile: (direction: "up" | "down" | "left" | "right") => void;
}

export const TileContainer = React.forwardRef<
  TileContainerRef,
  TileContainerProps
>(({
  children,
  borderStyle = "round",
  borderColor = "gray",
  emptyMessage = "No content to display",
  focusedTileIndex = 0,
  onTileFocus,
  onTileNavigation,
}: TileContainerProps, ref) => {
  const { stdout } = useStdout();

  const containerWidth = stdout.columns - 27; // Account for sidebar width
  const containerHeight = stdout.rows - 3; // Account for help bar height (1 + 2 for borders)

  useImperativeHandle(ref, () => ({
    navigateTile: handleTileNavigation,
  }));

  const childrenArray = React.Children.toArray(children);

  const calculateTileLayout = (tileCount: number): TileLayout => {
    if (tileCount === 0) {
      return {
        columns: 1,
        rows: 1,
        tileWidth: containerWidth - 2,
        tileHeight: containerHeight - 2,
      };
    }

    if (tileCount === 1) {
      return {
        columns: 1,
        rows: 1,
        tileWidth: containerWidth - 2,
        tileHeight: containerHeight - 2,
      };
    }

    if (tileCount === 2) {
      // For 2 tiles side by side, account for: container padding (2), tile borders (4), margin between tiles (1)
      const availableWidth = containerWidth - 2 - 4 - 1; // -2 for container padding, -4 for tile borders, -1 for margin
      return {
        columns: 2,
        rows: 1,
        tileWidth: Math.floor(availableWidth / 2),
        tileHeight: containerHeight - 2 - 2, // -2 for container padding, -2 for tile borders
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
        tileHeight: Math.floor(availableHeight / 2),
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
      tileHeight: Math.floor(availableHeight / rows),
    };
  };

  const moveTileFocus = (
    direction: "up" | "down" | "left" | "right",
    layout: TileLayout,
    totalTiles: number,
    currentIndex: number,
  ): number => {
    if (totalTiles === 0) return currentIndex;

    const currentRow = Math.floor(currentIndex / layout.columns);
    const currentCol = currentIndex % layout.columns;

    let newRow = currentRow;
    let newCol = currentCol;

    switch (direction) {
      case "up":
        newRow = currentRow > 0 ? currentRow - 1 : layout.rows - 1;
        break;
      case "down":
        newRow = currentRow < layout.rows - 1 ? currentRow + 1 : 0;
        break;
      case "left":
        newCol = currentCol > 0 ? currentCol - 1 : layout.columns - 1;
        break;
      case "right":
        newCol = currentCol < layout.columns - 1 ? currentCol + 1 : 0;
        break;
    }

    const newIndex = newRow * layout.columns + newCol;

    return newIndex < totalTiles ? newIndex : currentIndex;
  };

  const handleTileNavigation = (
    direction: "up" | "down" | "left" | "right",
  ) => {
    if (childrenArray.length <= 1) return;

    const layout = calculateTileLayout(childrenArray.length);
    const newIndex = moveTileFocus(
      direction,
      layout,
      childrenArray.length,
      focusedTileIndex,
    );

    if (newIndex !== focusedTileIndex && onTileFocus) {
      onTileFocus(newIndex);
    }

    if (onTileNavigation) {
      onTileNavigation(direction);
    }
  };

  if (childrenArray.length === 0) {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        borderStyle={borderStyle}
        borderColor={borderColor}
        width={containerWidth}
        height="100%"
        paddingX={1}
        paddingY={1}
      >
        <Text color="gray" dimColor>
          {emptyMessage}
        </Text>
      </Box>
    );
  }

  const layout = calculateTileLayout(childrenArray.length);

  if (childrenArray.length === 1) {
    return (
      <Box
        borderStyle={borderStyle}
        borderColor={borderColor}
        width={containerWidth}
        height="100%"
        paddingX={1}
        paddingY={1}
      >
        {childrenArray[0]}
      </Box>
    );
  }

  const renderTiles = () => {
    const tiles: React.ReactNode[] = [];

    for (let row = 0; row < layout.rows; row++) {
      const rowTiles: React.ReactNode[] = [];

      for (let col = 0; col < layout.columns; col++) {
        const tileIndex = row * layout.columns + col;

        if (tileIndex < childrenArray.length) {
          const isFocused = tileIndex === focusedTileIndex;

          rowTiles.push(
            React.createElement(
              Box,
              {
                key: tileIndex,
                borderStyle: "single",
                borderColor: isFocused ? "blue" : "gray",
                width: layout.tileWidth,
                height: layout.tileHeight,
                marginRight: col < layout.columns - 1 ? 1 : 0,
                paddingX: 1,
                paddingY: 1,
              },
              childrenArray[tileIndex],
            ),
          );
        }
      }

      tiles.push(
        React.createElement(
          Box,
          {
            key: row,
            flexDirection: "row",
            marginBottom: row < layout.rows - 1 ? 1 : 0,
          },
          ...rowTiles,
        ),
      );
    }

    return tiles;
  };

  return (
    <Box
      flexDirection="column"
      borderStyle={borderStyle}
      borderColor={borderColor}
      width={containerWidth}
      height="100%"
      paddingX={1}
      paddingY={1}
    >
      {renderTiles()}
    </Box>
  );
});
