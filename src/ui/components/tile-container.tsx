import React from "react";
import { Box, Text, useStdout } from "ink";
import { TileLayout } from "../service/ui-state-service.ts";

interface TileContainerProps {
  children: React.ReactNode[];
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';
  borderColor?: string;
  emptyMessage?: string;
  focusedTileIndex?: number;
  onTileFocus?: (index: number) => void;
}

export const TileContainer: React.FC<TileContainerProps> = ({
  children,
  borderStyle = 'round',
  borderColor = 'gray',
  emptyMessage = 'No content to display',
  focusedTileIndex = 0,
  onTileFocus
}) => {
  const { stdout } = useStdout();
  
  const containerWidth = stdout.columns - 27; // Account for sidebar width
  const containerHeight = stdout.rows; // Use full height
  
  const calculateTileLayout = (tileCount: number): TileLayout => {
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
  };

  if (children.length === 0) {
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

  const layout = calculateTileLayout(children.length);

  if (children.length === 1) {
    return (
      <Box 
        borderStyle={borderStyle}
        borderColor={borderColor}
        width={containerWidth}
        height="100%"
        paddingX={1}
        paddingY={1}
      >
        {children[0]}
      </Box>
    );
  }

  const renderTiles = () => {
    const tiles: React.ReactNode[] = [];
    
    for (let row = 0; row < layout.rows; row++) {
      const rowTiles: React.ReactNode[] = [];
      
      for (let col = 0; col < layout.columns; col++) {
        const tileIndex = row * layout.columns + col;
        
        if (tileIndex < children.length) {
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
                paddingY: 1
              },
              children[tileIndex]
            )
          );
        }
      }
      
      tiles.push(
        React.createElement(
          Box,
          {
            key: row,
            flexDirection: "row",
            marginBottom: row < layout.rows - 1 ? 1 : 0
          },
          ...rowTiles
        )
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
};