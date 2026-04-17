#!/usr/bin/env python3
"""
Create a Jira sub-task under a parent ticket.

Usage:
  python3 jira_create_subtask.py <PARENT-TICKET-ID> <SUMMARY> [DESCRIPTION]

Arguments:
  PARENT-TICKET-ID  Jira ticket key of the parent (e.g., MON-428)
  SUMMARY           Sub-task title
  DESCRIPTION       Optional wiki markup description (default: empty)

Exits non-zero and prints an error if the Sub-task issue type is not available
in the project's type scheme. In that case, fall back to the context-manager
Jira backend strategy (linked peer tickets or parent-only).

Environment:
  JIRA_DOMAIN  Jira domain (default: invoca.atlassian.net)
"""
import sys
import os
import json
import subprocess

sys.path.insert(0, os.path.dirname(__file__))
from jira_auth import get_auth, get_domain


def create_subtask(parent_key, summary, description, domain, auth):
    project_key = parent_key.split("-")[0]
    body = json.dumps({
        "fields": {
            "project": {"key": project_key},
            "parent": {"key": parent_key},
            "summary": summary,
            "description": description,
            "issuetype": {"name": "Sub-task"}
        }
    })
    result = subprocess.run([
        "curl", "-s", "-X", "POST",
        f"https://{domain}/rest/api/2/issue",
        "-H", f"Authorization: Basic {auth}",
        "-H", "Content-Type: application/json",
        "-d", body
    ], capture_output=True, text=True)
    return json.loads(result.stdout)


def main():
    if len(sys.argv) < 3:
        print("Usage: jira_create_subtask.py <PARENT-TICKET-ID> <SUMMARY> [DESCRIPTION]",
              file=sys.stderr)
        sys.exit(1)

    parent_key = sys.argv[1]
    summary = sys.argv[2]
    description = sys.argv[3] if len(sys.argv) > 3 else ""

    domain = get_domain()
    auth = get_auth()

    data = create_subtask(parent_key, summary, description, domain, auth)

    if "key" in data:
        key = data["key"]
        print(f"Created: {key} — https://{domain}/browse/{key}")
    else:
        errors = data.get("errors", {})
        messages = data.get("errorMessages", [])
        if "issuetype" in str(errors) or "Sub-task" in str(errors):
            print(
                f"Error: Sub-task issue type is not available in project "
                f"{parent_key.split('-')[0]}. "
                f"See context-manager Jira backend fallback strategy.",
                file=sys.stderr
            )
        else:
            print(f"Error: {json.dumps(data)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
