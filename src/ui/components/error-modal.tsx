import React from "react";
import { Box, Text, useInput } from "ink";

interface ErrorModalProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isVisible,
  message,
  onClose
}: ErrorModalProps) => {
  useInput((input, key) => {
    if (key.escape || key.return) {
      onClose();
    }
  });

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        width={60}
        borderStyle="round"
        borderColor="red"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        backgroundColor="black"
      >
        <Text color="red" bold>
          Error
        </Text>
        <Text color="white" wrap="wrap">
          {message}
        </Text>
        <Text color="gray" dimColor>
          Press Escape or Enter to close
        </Text>
      </Box>
    </Box>
  );
};