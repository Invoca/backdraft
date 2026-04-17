---
source: agent-rules
name: atlassian
version: 2.1.0
description: Use when working with Jira — reading tickets via acli, writing via REST API (append descriptions, set custom fields, assign sprints), or any Atlassian task. Trigger on "Jira", "Atlassian", "update ticket", "append to Jira", "set story points", "write to ticket", "set sprint", or any URL to invoca.atlassian.net.
origin: invoca/agent-rules
read-only: true
---

# Atlassian Skill

Covers Jira reads via `acli` and all REST API v2 write patterns. Always use wiki markup (not ADF/Markdown) for description content. Always fetch-then-append — never overwrite the full description.

For field IDs, sprint board IDs, and team labels, see @.agents/skills/atlassian/references/field-ids.md.

## Prerequisites

- Atlassian CLI (`acli`) installed and authenticated (see below)
- Python 3 (`python3`) — available as a macOS built-in; no packages required
- `curl` and `security` — macOS built-ins
- Atlassian API token in macOS Keychain — see @.agents/skills/macos-keychain/SKILL.md

## acli Setup

Check if installed:

```bash
acli --version
```

If not installed:

```bash
brew tap atlassian/homebrew-acli
brew install acli
```

If out of date:

```bash
brew update && brew upgrade acli
```

### Authenticating

```bash
# Check status
acli jira auth status

# Authenticate if needed
acli jira auth login --web
```

## Known acli Limitations

- **`workitem view` uses positional arg, not `--key`**: `acli jira workitem view PROJ-123` (no flag)
- **No `--parent` flag on `workitem edit`**: Cannot set epic/parent link via acli. Use the Jira REST API for this.
- **`--key` and `--from-json` are mutually exclusive on `workitem edit`**: Cannot combine them.
- **`--yes` flag**: Required to skip confirmation prompts on edit and transition commands.
- **Self-assign**: Use `--assignee '@me'` or the user's email directly (e.g. `dpeck@invoca.com`).
- **`acli` Jira fallback**: If `acli` produces errors or unexpected output when reading or updating a Jira ticket, fall back to the REST API scripts in this skill (`atlassian/scripts/`). These are more reliable for field reads, custom field writes, and description appends.
- **`acli confluence` is space-level only**: It cannot read or write Confluence page content. If you need to fetch or update a page, use one of these alternatives:
  1. **Atlassian REST API + keychain token** — retrieve via `security find-generic-password -s "atlassian-api-token" -w`, then `curl -u "user@example.com:<token>" "https://<org>.atlassian.net/wiki/rest/api/content/<page-id>?expand=body.storage"`
  2. **MCP Confluence server** — if configured in the environment, use the Confluence MCP tools for page reads and writes.

  Steps that require reading Confluence page content should check for these prerequisites before proceeding.

## acli Commands

### View a work item

```bash
acli jira workitem view PROJ-123
acli jira workitem view PROJ-123 --fields summary,status,assignee,labels
acli jira workitem view PROJ-123 --fields '*all'
acli jira workitem view PROJ-123 --json
acli jira workitem view PROJ-123 --web
```

### Create a work item

```bash
acli jira workitem create --summary "New Task" --project "TEAM" --type "Task"
acli jira workitem create --summary "Bug fix" --project "PROJ" --type "Bug" \
  --assignee "user@example.com" --label "bug,cli"
acli jira workitem create --summary "My Task" --project "TEAM" --type "Task" \
  --assignee "@me"
acli jira workitem create --from-json "workitem.json"
acli jira workitem create --generate-json
```

### Edit a work item

```bash
acli jira workitem edit --key "KEY-1" --summary "New Summary" --yes
acli jira workitem edit --key "KEY-1" --description "Updated description" --yes
acli jira workitem edit --key "KEY-1" --assignee "user@example.com" --yes
acli jira workitem edit --key "KEY-1" --labels "label1,label2" --yes
acli jira workitem edit --key "KEY-1,KEY-2" --summary "New Summary" --yes
acli jira workitem edit --jql "project = TEAM AND status = 'To Do'" \
  --assignee "user@example.com" --yes
acli jira workitem edit --from-json "workitem.json" --yes
acli jira workitem edit --generate-json
```

### Transition a work item

```bash
acli jira workitem transition --key "KEY-1" --status "In Progress" --yes
acli jira workitem transition --key "KEY-1,KEY-2" --status "Done" --yes
acli jira workitem transition --jql "project = TEAM" --status "In Progress" --yes
```

---

## REST API Write Patterns

### Scripts

Use these bundled scripts instead of writing inline curl/Python — they handle auth, JSON safety, and error handling consistently:

| Script | Usage |
|---|---|
| `jira_append_section.py` | Append or replace a `h2.` section in a ticket description |
| `jira_get_section.py` | Read a named `h2.` section from a ticket description |
| `jira_set_field.py` | Set a custom field (story points, QA owner, post-deploy checks, etc.) |
| `jira_get_account_id.py` | Get the current user's Jira accountId |
| `jira_create_subtask.py` | Create a Jira-native sub-task under a parent ticket |
| `jira_add_comment.py` | Add a wiki markup comment to a ticket |

```bash
# Append or replace a section in the ticket description
python3 @.agents/skills/atlassian/scripts/jira_append_section.py \
  <TICKET-ID> "<Section Heading>" "<wiki markup content>"

# Read a named section from the ticket description
python3 @.agents/skills/atlassian/scripts/jira_get_section.py \
  <TICKET-ID> "<Section Heading>"

# Set a custom field (use alias or raw field ID)
python3 @.agents/skills/atlassian/scripts/jira_set_field.py \
  <TICKET-ID> story_points 3
python3 @.agents/skills/atlassian/scripts/jira_set_field.py \
  <TICKET-ID> qa_owner '{"accountId": "abc123"}'
python3 @.agents/skills/atlassian/scripts/jira_set_field.py \
  <TICKET-ID> post_deploy_checks "Verify feature flag is enabled"

# Get current user's accountId (needed for user-type fields)
python3 @.agents/skills/atlassian/scripts/jira_get_account_id.py

# Create a sub-task under a parent ticket
python3 @.agents/skills/atlassian/scripts/jira_create_subtask.py \
  <PARENT-TICKET-ID> "<Sub-task title>" "<wiki markup description>"

# Add a comment to a ticket
python3 @.agents/skills/atlassian/scripts/jira_add_comment.py \
  <TICKET-ID> "<wiki markup comment>"
```

`jira_set_field.py` supports these field aliases (see field-ids.md for IDs):
- `story_points` → `customfield_13529`
- `qa_owner` → `customfield_10500`
- `post_deploy_checks` → `customfield_12100`

All scripts default to `invoca.atlassian.net`. Override with `JIRA_DOMAIN=<domain>` if needed.

### Authentication

Scripts handle auth automatically via git config + macOS Keychain. For manual curl calls:

```bash
JIRA_USER=$(git config user.email)
JIRA_TOKEN=$(security find-generic-password -s "atlassian-api-token" -a "${JIRA_USER}" -w)
JIRA_AUTH=$(echo -n "${JIRA_USER}:${JIRA_TOKEN}" | base64)
```

If the token lookup fails, see @.agents/skills/macos-keychain/SKILL.md for setup instructions.

## REST API Read Patterns

### Read a ticket field

```bash
curl -s "https://invoca.atlassian.net/rest/api/2/issue/<TICKET-ID>?fields=summary,status,description,labels,assignee" \
  -H "Authorization: Basic ${JIRA_AUTH}"
```

### Read a named description section

```bash
python3 @.agents/skills/atlassian/scripts/jira_get_section.py \
  <TICKET-ID> "<Section Heading>"
```

Returns the content under the `h2. <Section Heading>` block, or empty if not found.

### Read ticket comments

```bash
curl -s "https://invoca.atlassian.net/rest/api/2/issue/<TICKET-ID>/comment" \
  -H "Authorization: Basic ${JIRA_AUTH}"
```

### List sub-tasks of a ticket

```bash
curl -s "https://invoca.atlassian.net/rest/api/2/issue/<TICKET-ID>?fields=subtasks" \
  -H "Authorization: Basic ${JIRA_AUTH}" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for st in data['fields']['subtasks']:
    print(f\"{st['key']} — {st['fields']['summary']} [{st['fields']['status']['name']}]\")
"
```

---

## REST API Write Patterns (extended)

### Add a comment

```bash
python3 @.agents/skills/atlassian/scripts/jira_add_comment.py \
  <TICKET-ID> "<wiki markup comment>"
```

### Create a sub-task

> **Note:** The sub-task issue type must exist in the project's type scheme. Query available types with:
> ```bash
> curl -s "https://invoca.atlassian.net/rest/api/2/project/<PROJECT-KEY>/issuetypes" \
>   -H "Authorization: Basic ${JIRA_AUTH}" | python3 -c "import sys,json; [print(t['name']) for t in json.load(sys.stdin)]"
> ```
> If "Sub-task" is not available, see the agentic-workflow-context skill for the Jira backend fallback strategy.

```bash
python3 @.agents/skills/atlassian/scripts/jira_create_subtask.py \
  <PARENT-TICKET-ID> "<Sub-task title>" "<wiki markup description>"
```

### Fetch-Then-Append Pattern (reference)

The scripts implement this pattern. For one-off cases where a script isn't appropriate:

**Why Python for the PUT body:** Shell string interpolation breaks on quotes, newlines, and special characters in descriptions. Always use `json.dumps()` to build the request body safely.

The pattern: fetch current description → build new `h2.` section in wiki markup → if section exists replace it, otherwise append → PUT back the combined content.

### Timestamps

All sign-off entries use:

```bash
date '+%Y-%m-%d %H:%M %Z'
```

### Wiki Markup Quick Reference

| Intent | Markup |
|---|---|
| Section heading | `h2. Section Title` |
| Bold | `*bold text*` |
| Bullet list | `- item` |
| Numbered list | `# item` |
| Code block | `{code}...{code}` |
| Inline code | `{{inline}}` |
| Horizontal rule | `----` |
| Link | `[Label\|https://url]` |
