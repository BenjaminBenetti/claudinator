FROM denoland/deno:bin-2.4.0 AS deno
FROM mcr.microsoft.com/devcontainers/base:noble

# install deno
COPY --from=deno /deno /usr/local/bin/deno

# user setup
USER vscode

# make file mount paths ahead of time, to prevent root ownership.
RUN mkdir -p ~/.vscode-server/data/User
RUN mkdir -p ~/.claude