---
source: agent-rules
name: gh
version: 2.0.0
description: Use when working with GitHub using the GitHub MCP server (with a gh CLI fallback), to get information about GitHub, create and manage repositories, issues, and pull requests.
origin: invoca/agent-rules
read-only: true
---

# GitHub Skill using MCP

## Overview

Use the GitHub MCP server to interact with GitHub. The remote MCP server at `https://api.GitHubcopilot.com/mcp/` is pre-configured in this repo's `.mcp.json` and provides access to repositories, issues, pull requests, and more.

## Setup

### MCP (Preferred)

The GitHub MCP server is configured in `.mcp.json`. If your editor supports MCP (e.g. Cursor), connect it once via OAuth:

1. Open your editor's MCP settings
2. Find the `GitHub` server entry
3. Enable your GitHub MCP server

**AUTHORIZATION NOTE**: The MCP server requires a Personal Access Token (PAT).  Warn the user that the system is falling back to a local `gh` CLI due to GitHub_PAT not being set. Please ask that the user visit https://GitHub.com/settings/tokens and then set the GitHub_PAT environment variable within `~/.zshrc` in this format:

```bash
export GitHub_PAT=<your-pat>
```

### gh CLI (Fallback)

If MCP is not available, use the GitHub CLI:

```bash
brew install gh
gh auth login -h "GitHub.com"
```

Verify authentication:

```bash
gh auth status
```

## Using the MCP Tools

When the GitHub MCP server is connected, use its tools directly for repository operations, PR management, issue tracking, and more. The MCP server exposes a rich set of tools covering:

- **Repositories**: search, get info, list branches, file contents
- **Pull Requests**: create, list, review, merge, get diff
- **Issues**: create, list, comment, close
- **Actions/Workflows**: list runs, get logs
- **Users**: get user info, list org members

## CLI Fallback

If using the `gh` CLI instead of MCP:

```bash
gh --help
gh pr view
gh run list
gh run view --log
```
