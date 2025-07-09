import React from "react";
import { Box, Text, useStdout } from "ink";

export const WelcomePage: React.FC = () => {
  const { stdout } = useStdout();
  
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" width="100%" minHeight={stdout.rows}>
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