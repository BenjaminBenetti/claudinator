import React from "react";
import { Box, Text } from "ink";
import { AgentTileProps } from "./types.ts";

export const ShellMode: React.FC<AgentTileProps> = ({
  agent,
  isFocused = false,
}: AgentTileProps) => {
  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Text color="white">shell</Text>
      {isFocused && (
        <Box>
          <Text color="blue" dimColor>
            [Focused - Use arrow keys to navigate]
          </Text>
        </Box>
      )}
    </Box>
  );
};
