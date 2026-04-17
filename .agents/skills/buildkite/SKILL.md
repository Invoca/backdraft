---
source: agent-rules
name: buildkite
version: 3.0.0
description: Use when working with Buildkite CI/CD — fetching build status, reading logs, diagnosing failures, retrying builds, or navigating pipelines. Covers MCP setup, CLI fallback, and Invoca-specific pipeline knowledge. Trigger on "CI is failing", "check the build", "Buildkite", "pipeline", "build logs", "build is failing", or any CI-related task.
origin: invoca/agent-rules
read-only: true
---

# Buildkite Skill

## Setup

### MCP (Preferred)

The Buildkite MCP server is configured in `.mcp.json`. If your editor supports MCP (e.g. Cursor), connect it once via OAuth:

1. Open your editor's MCP settings
2. Find the `buildkite` server entry
3. Click **Connect** and authorize via your Buildkite account

No API token configuration needed — the server issues a short-lived OAuth token automatically.

### bk CLI (Fallback)

If MCP is not available, install the Buildkite CLI:

```bash
brew install buildkite/buildkite/bk@3
bk configure   # enter your org slug and API token
```

Required API token scopes: `read_artifacts`, `read_builds`, `write_builds`, `read_build_logs`, `read_pipelines`, `read_user`.

## MCP Tools Reference

| MCP Tool | Purpose |
|----------|---------|
| `list_builds` | List builds for a pipeline, optionally filtered by branch/state |
| `get_build` | Get details of a specific build including all jobs |
| `list_jobs` | List jobs for a build |
| `get_job_log` | Fetch the log output for a specific job |
| `list_pipelines` | List pipelines in an organization |
| `get_pipeline` | Get details of a specific pipeline |
| `list_artifacts` | List artifacts for a build |

## Invoca Pipeline Conventions

- **Organization slug**: `invoca`
- **Pipeline format**: `invoca/<repo-name>` (e.g., `invoca/web`, `invoca/Titan`)
- **Always use `-p` flag** (CLI) instead of `--org` for pipeline targeting
- **Use `-o json`** (CLI) for machine-readable output when parsing results

## Scripts

| Script | Usage |
|---|---|
| `bk-retry-job` | Retry a single failed job without rebuilding the entire pipeline |

### bk-retry-job

Use when one unrelated job failed (e.g. a flaky E2E test) and you want to retry only that job, not trigger a full rebuild.

```bash
# Get the build number and failing job ID first
bk build view <BUILD-NUMBER> -p invoca/<repo> -o json

# Then retry just the failing job
.agents/skills/buildkite/scripts/bk-retry-job <BUILD-NUMBER> <JOB-ID> [PIPELINE] [ORG]
```

Requires `buildkite-api-token` in macOS Keychain — see @.agents/skills/macos-keychain/SKILL.md.

## Common Workflows

### Check Build Status for Current Branch

**MCP:**
Use the `list_builds` tool with `organization_slug: "invoca"`, `pipeline_slug: "<repo>"`, and `branch: "<current-branch>"`.

**CLI fallback:**
```bash
BRANCH=$(git branch --show-current)
REPO=$(basename $(git rev-parse --show-toplevel))
bk build list -p invoca/$REPO --branch $BRANCH --limit 5 -o json
```

### View a Specific Build

**MCP:**
Use the `get_build` tool with `organization_slug: "invoca"`, `pipeline_slug: "<repo>"`, `build_number: <n>`.

**CLI fallback:**
```bash
bk build view <build-number> -p invoca/<repo> -o json
```

### Find Failed Jobs in a Build

**MCP:**
Use `get_build` to retrieve the build, then inspect `jobs` where `state == "failed"`.

**CLI fallback:**
```bash
bk build view <build-number> -p invoca/<repo> -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for job in data.get('jobs', []):
    if job.get('state') == 'failed':
        print(f'{job[\"name\"]} ({job[\"id\"]})')
"
```

### Fetch Logs for a Failing Job

**MCP:**
Use the `get_job_log` tool with the job ID.

**CLI fallback:**
```bash
bk job log <job-id> -p invoca/<repo> > /tmp/job.log
```

### Retry a Failed Build

**CLI** (write operations not available via readonly MCP):
```bash
bk build retry <build-number> -p invoca/<repo>
```

### List Recent Builds

**MCP:**
Use `list_builds` with `organization_slug: "invoca"` and `pipeline_slug: "<repo>"`.

**CLI fallback:**
```bash
bk build list -p invoca/<repo> --limit 10 -o json
```

## Reading Build Output

Key fields when working with build data:

| Field | Meaning |
|-------|---------|
| `state` | `passed`, `failed`, `running`, `canceled`, `scheduled` |
| `number` | Build number (use this for follow-up commands) |
| `branch` | Branch name |
| `jobs[].state` | Per-job state |
| `jobs[].name` | Step label in pipeline |
| `jobs[].exit_status` | Non-zero means failed |
| `jobs[].log_url` | Direct URL to job log |

## CLI Gotchas

- **`bk job log` requires `-p` flag.** Use `bk job log <job-id> -p invoca/<pipeline>`, not positional args.
- **`--org` flag does not exist** on most subcommands. Use `-p invoca/<pipeline>`.
- **Log output contains timestamp prefixes** like `_bk;t=1234567890` and ANSI codes. Strip these when parsing.
- **To find the root error in a failed job log**, search for `FAIL`, `Error`, `SyntaxError`, `Cannot find`. The actual error is usually well above the final exit code message.

## Diagnosing CI Failures

When a build fails, work through these in order:

1. **Get the failing jobs**: retrieve the build, find jobs where `state == "failed"`
2. **Fetch logs for each failing job**: look for the first error, not the last
3. **Classify the failure** — see `/DEBUG-CI` command for full classification guide
4. **Check if it's infrastructure**: look for OOM, Docker pull errors, network timeouts — retry if so
5. **Check if main is also failing**: list recent builds for the `main` branch

## Common Failure Patterns at Invoca

### Asset Digest Mismatch

```
Expected 27 non-digest assets, got 666
```

The asset compilation step ran after the step that needs compiled assets. Check pipeline step ordering in `.buildkite/pipeline.yml`.

### Capybara / System Test Flakes

```
Capybara::ElementNotFound
Net::ReadTimeout
```

Usually infrastructure noise or missing `wait_for` in test. Retry the build first. If it fails consistently, use `/DEBUG-CI`.

### Webpack / esbuild Errors

```
Module not found: Error: Can't resolve '...'
```

Check if a new import was added that doesn't exist, or if a package was removed from `package.json`.

## Triggering CI Debugging

For a full structured CI debugging workflow, use `/DEBUG-CI`. This skill provides the raw Buildkite access; the command provides the diagnostic process.
