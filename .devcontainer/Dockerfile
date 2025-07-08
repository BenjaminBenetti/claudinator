FROM mcr.microsoft.com/devcontainers/base:noble

# user setup
USER vscode

# make file mount paths ahead of time, to prevent root ownership.
RUN mkdir -p ~/.vscode-server/data/User
RUN mkdir -p ~/.claude