/**
 * Generates cool names for Claudinator agents with the format: claudinator_{cool_name}
 */

const ADJECTIVES = [
  "stellar",
  "cosmic",
  "quantum",
  "neural",
  "cyber",
  "digital",
  "atomic",
  "neon",
  "phantom",
  "shadow",
  "blaze",
  "storm",
  "thunder",
  "lightning",
  "frost",
  "crimson",
  "azure",
  "jade",
  "golden",
  "silver",
  "iron",
  "steel",
  "crystal",
  "ember",
  "vortex",
  "nexus",
  "matrix",
  "vector",
  "cipher",
  "prism",
  "flux",
  "echo",
  "nova",
  "comet",
  "meteor",
  "orbit",
  "galaxy",
  "pulsar",
  "quasar",
  "nebula",
];

const NOUNS = [
  "falcon",
  "hawk",
  "eagle",
  "raven",
  "phoenix",
  "dragon",
  "wolf",
  "tiger",
  "panther",
  "shark",
  "viper",
  "cobra",
  "lynx",
  "jaguar",
  "cheetah",
  "leopard",
  "runner",
  "hunter",
  "scout",
  "guardian",
  "sentinel",
  "warden",
  "ranger",
  "knight",
  "warrior",
  "champion",
  "hero",
  "legend",
  "master",
  "sage",
  "wizard",
  "mage",
  "blade",
  "arrow",
  "spear",
  "shield",
  "hammer",
  "axe",
  "sword",
  "dagger",
  "storm",
  "wave",
  "flame",
  "spark",
  "bolt",
  "ray",
  "beam",
  "flash",
];

/**
 * Generates a random cool name with the claudinator_ prefix
 * @returns A string in the format "claudinator_{adjective}_{noun}"
 */
export function generateClaudinatorName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `claudinator_${adjective}_${noun}`;
}

/**
 * Checks if a name follows the claudinator naming convention
 * @param name The name to check
 * @returns True if the name starts with "claudinator_"
 */
export function isClaudinatorName(name: string): boolean {
  return name.startsWith("claudinator_");
}

/**
 * Extracts the cool name part from a claudinator name
 * @param name The full claudinator name
 * @returns The cool name part without the prefix, or null if not a claudinator name
 */
export function extractCoolName(name: string): string | null {
  if (!isClaudinatorName(name)) {
    return null;
  }
  return name.substring("claudinator_".length);
}
