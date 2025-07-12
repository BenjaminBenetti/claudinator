import React, { useEffect, useState } from "react";
import { Box, Text, useStdout } from "ink";

export const WelcomePage: React.FC = () => {
  const { stdout } = useStdout();

  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  const loadingMessages = [
    "Counting Claudes",
    "Wrangling Claudes",
    "Herding AI Cats",
    "Summoning Code Spirits",
    "Loading Brilliance",
    "Assembling AI Army",
    "Brewing Digital Magic",
  ];

  useEffect(() => {
    const spinnerInterval = setInterval(() => {
      setSpinnerIndex((prev: number) => (prev + 1) % spinner.length);
    }, 100);

    const messageInterval = setInterval(() => {
      setMessageIndex((prev: number) => (prev + 1) % loadingMessages.length);
    }, 1000);

    return () => {
      clearInterval(spinnerInterval);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      minHeight={stdout.rows}
    >
      <Box
        flexDirection="column"
        alignItems="center"
        padding={2}
        borderStyle="round"
        borderColor="green"
      >
        <Text color="green" bold>
          ░█████╗░██╗░░░░░░█████╗░██╗░░░██╗██████╗░██╗███╗░░██╗░█████╗░████████╗░█████╗░██████╗░
        </Text>
        <Text color="green" bold>
          ██╔══██╗██║░░░░░██╔══██╗██║░░░██║██╔══██╗██║████╗░██║██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗
        </Text>
        <Text color="green" bold>
          ██║░░╚═╝██║░░░░░███████║██║░░░██║██║░░██║██║██╔██╗██║███████║░░░██║░░░██║░░██║██████╔╝
        </Text>
        <Text color="green" bold>
          ██║░░██╗██║░░░░░██╔══██║██║░░░██║██║░░██║██║██║╚████║██╔══██║░░░██║░░░██║░░██║██╔══██╗
        </Text>
        <Text color="green" bold>
          ╚█████╔╝███████╗██║░░██║╚██████╔╝██████╔╝██║██║░╚███║██║░░██║░░░██║░░░╚█████╔╝██║░░██║
        </Text>
        <Text color="green" bold>
          ░╚════╝░╚══════╝╚═╝░░╚═╝░╚═════╝░╚═════╝░╚═╝╚═╝░░╚══╝╚═╝░░╚═╝░░░╚═╝░░░░╚════╝░╚═╝░░╚═╝
        </Text>

        <Box marginTop={1}>
          <Text color="cyan" bold>
            I hope you have the Max plan...
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="yellow">
            {spinner[spinnerIndex]} {loadingMessages[messageIndex]}...
          </Text>
        </Box>
      </Box>

      <Box marginTop={2}>
        <Text color="gray" dimColor>
          Press Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  );
};
