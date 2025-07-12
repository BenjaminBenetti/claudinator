import React from "react";
import { Box, Text, useInput } from "ink";
import { GitHubApiError } from "../../github/errors/github-api-error.ts";

interface ErrorModalProps {
  isVisible: boolean;
  error: Error | GitHubApiError | string;
  onClose: () => void;
  onRetry?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isVisible,
  error,
  onClose,
  onRetry
}: ErrorModalProps) => {
  useInput((_input, key) => {
    if (key.escape) {
      onClose();
    } else if (key.return) {
      if (onRetry && error instanceof GitHubApiError && error.isRetryable()) {
        onRetry();
      } else {
        onClose();
      }
    }
  });

  if (!isVisible) {
    return null;
  }

  const getErrorMessage = (): string => {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error instanceof GitHubApiError) {
      return error.getUserFriendlyMessage();
    }
    
    return error.message || 'An unknown error occurred';
  };

  const getErrorTitle = (): string => {
    if (error instanceof GitHubApiError) {
      if (error.status === 401) return 'Authentication Error';
      if (error.status === 403) return 'Permission Error';
      if (error.status === 404) return 'Not Found';
      if (error.status === 429) return 'Rate Limited';
      if (error.status && error.status >= 500) return 'Server Error';
    }
    return 'Error';
  };

  const getErrorColor = (): string => {
    if (error instanceof GitHubApiError) {
      if (error.status === 401 || error.status === 403) return 'yellow';
      if (error.status === 404) return 'blue';
      if (error.status === 429) return 'magenta';
      if (error.status && error.status >= 500) return 'cyan';
    }
    return 'red';
  };

  const showRetryOption = onRetry && error instanceof GitHubApiError && error.isRetryable();
  const instructions = showRetryOption 
    ? 'Press Enter to retry, Escape to close'
    : 'Press Escape or Enter to close';

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        width={80}
        borderStyle="round"
        borderColor={getErrorColor()}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        backgroundColor="black"
      >
        <Text color={getErrorColor()} bold>
          {getErrorTitle()}
        </Text>
        
        <Box marginY={1} width="100%" justifyContent="center">
          <Text color="white" wrap="wrap">
            {getErrorMessage()}
          </Text>
        </Box>

        {error instanceof GitHubApiError && error.requestId && (
          <Box marginY={1}>
            <Text color="gray" dimColor>
              Request ID: {error.requestId}
            </Text>
          </Box>
        )}

        {showRetryOption && (
          <Box marginY={1}>
            <Text color="green">
              This error can be retried
            </Text>
          </Box>
        )}

        <Text color="gray" dimColor>
          {instructions}
        </Text>
      </Box>
    </Box>
  );
};