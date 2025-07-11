import React from "react";
import { Box, Text } from "ink";
import { FocusArea } from "../service/ui-state-service.ts";

interface HelpBarProps {
  focusArea: FocusArea;
}

const HELP_TEXT_MAP: Record<FocusArea, string> = {
  [FocusArea.Sidebar]: "d - Details, esc - Clear all selection",
  [FocusArea.Tile]: "d - Details, t - Terminal, m - Menu, backspace - Close"
};

export const HelpBar: React.FC<HelpBarProps> = ({ focusArea }: HelpBarProps) => {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      width="100%"
    >
      <Text color="gray" dimColor>
        {HELP_TEXT_MAP[focusArea]}
      </Text>
    </Box>
  );
};