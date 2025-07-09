import React from "react";
import { Box, Text } from "ink";

export const WelcomePage: React.FC = () => {
  return (
    <Box flexDirection="column" alignItems="center" padding={2}>
      <Text color="green" bold>
        🦕 Claudinator
      </Text>
      <Text color="gray">
        Welcome to your CLI application!
      </Text>
      <Text color="yellow">
        Press Ctrl+C to exit
      </Text>
    </Box>
  );
};