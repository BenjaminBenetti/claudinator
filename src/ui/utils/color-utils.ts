/**
 * Color utility functions for terminal rendering.
 */

import { BASIC_COLORS } from "../../tty/models/ansi-sequence-model.ts";

/**
 * Converts a color code to an Ink-compatible color string.
 *
 * @param colorCode - ANSI color code (0-7 for basic colors)
 * @returns Ink color string or undefined for default
 */
export function convertColorCode(colorCode: number | [number, number, number] | undefined): string | undefined {
  if (colorCode === undefined) return undefined;

  switch (colorCode) {
    case BASIC_COLORS.BLACK:
      return "black";
    case BASIC_COLORS.RED:
      return "red";
    case BASIC_COLORS.GREEN:
      return "green";
    case BASIC_COLORS.YELLOW:
      return "yellow";
    case BASIC_COLORS.BLUE:
      return "blue";
    case BASIC_COLORS.MAGENTA:
      return "magenta";
    case BASIC_COLORS.CYAN:
      return "cyan";
    case BASIC_COLORS.WHITE:
      return "white";
    default:
      return undefined;
  }
}
