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
  const containerHeight = stdout.rows - 4; // Account for borders and padding
  
  const calculateTileLayout = (tileCount: number): TileLayout => {
    if (tileCount === 0) {
      return { columns: 1, rows: 1, tileWidth: containerWidth, tileHeight: containerHeight };
    }

    if (tileCount === 1) {
      return { columns: 1, rows: 1, tileWidth: containerWidth, tileHeight: containerHeight };
    }

    if (tileCount === 2) {
      return { 
        columns: 2, 
        rows: 1, 
        tileWidth: Math.floor(containerWidth / 2) - 1, 
        tileHeight: containerHeight 
      };
    }

    if (tileCount <= 4) {
      return { 
        columns: 2, 
        rows: 2, 
        tileWidth: Math.floor(containerWidth / 2) - 1, 
        tileHeight: Math.floor(containerHeight / 2) - 1 
      };
    }

    const columns = Math.ceil(Math.sqrt(tileCount));
    const rows = Math.ceil(tileCount / columns);

    return {
      columns,
      rows,
      tileWidth: Math.floor(containerWidth / columns) - 1,
      tileHeight: Math.floor(containerHeight / rows) - 1
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
        height={containerHeight}
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
        height={containerHeight}
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
      height={containerHeight}
      paddingX={1}
      paddingY={1}
    >
      {renderTiles()}
    </Box>
  );
};