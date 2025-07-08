export const HELP_TEXT = `
Claudinator - Multi-agent Claude Code orchestrator for GitHub Codespaces

USAGE:
    claudinator [OPTIONS]

OPTIONS:
    -h, --help      Print this help message
    -v, --version   Print version information

DESCRIPTION:
    Claudinator is a CLI tool that lets you launch multiple Claude Code agent sessions
    on distinct GitHub Codespaces. Work across multiple branches simultaneously with
    different agents, then seamlessly pull branches to your local environment for testing.

    Core capabilities:
    • Launch multiple Claude Code agents in the cloud
    • Work across agents simultaneously 
    • Seamlessly switch your local between agent cloud environments

EXAMPLES:
    claudinator                 # Launch the orchestrator
    claudinator --help          # Show this help message
    claudinator --version       # Show version information

REQUIREMENTS:
    • GitHub CLI (gh) - https://cli.github.com/
    • Claude Code - https://www.anthropic.com/claude-code

For more information, visit: https://github.com/BenjaminBenetti/claudinator
`;

export const VERSION_INFO = `
Claudinator v1.0.0
Built with Deno ${Deno.version.deno}
TypeScript ${Deno.version.typescript}
V8 ${Deno.version.v8}
`;

export function displayHelp(): void {
  console.log(HELP_TEXT.trim());
}

export function displayVersion(): void {
  console.log(VERSION_INFO.trim());
}