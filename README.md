# Claudinator

Claudinator is much like [Terminator](https://gnome-terminator.org/) it is a cli
tool that let's you launch multiple claude code agent session on disntinct
GitHub Codespaces. Unleash your agents, work on multiple branches at the same
time. Seemlessly pull the branches to your local for testing.

## Core Ideas

- Launch multiple Claude Code agents in the cloud.
- Work across agents simultaniously.
- Seemlessly switch your local between the agent cloud enviroments.

## Requirements

Install the following on your system / devcontainer.

- [GitHub CLI](https://cli.github.com/)
- [Claude Code](https://www.anthropic.com/claude-code)

### GitHub CLI Authentication

The `gh` CLI must be authenticated with the **`codespace`** scope. Without it,
you'll get an error like:

> Must have admin rights to Repository.

To add the required scope, run:

```bash
gh auth refresh -h github.com -s codespace
```

This will open a browser to authorize the additional scope. You can verify your
scopes with:

```bash
gh auth status
```

Look for `codespace` in the token scopes list.

## Codespace Requirements

If you use a custom devcontainer on your repo, it `MUST` have the sshd feature
installed. This is required for the CLI to connect to the codespace.

```json
"features": {
  // ... other features
  "ghcr.io/devcontainers/features/sshd:1": {
    "version": "latest"
  }
}
```
