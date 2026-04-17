#!/usr/bin/env python3
"""
Set a custom field on a Jira ticket.

Usage:
  python3 jira_set_field.py <TICKET-ID> <FIELD-ID> <VALUE>

Arguments:
  TICKET-ID  Jira ticket key (e.g., MON-428)
  FIELD-ID   Field ID or alias (see FIELD_ALIASES below)
  VALUE      Value to set. Use JSON for objects/arrays, plain text for strings/numbers.
             Examples:
               3                                  (story points)
               "some text"                        (string field)
               '{"accountId": "abc123"}'          (user field like QA Owner)

Field aliases (see references/field-ids.md for IDs):
  story_points       → customfield_13529
  qa_owner           → customfield_10500
  post_deploy_checks → customfield_12100

Environment:
  JIRA_DOMAIN  Jira domain (default: invoca.atlassian.net)
"""
import sys
import os
import json
import subprocess

sys.path.insert(0, os.path.dirname(__file__))
from jira_auth import get_auth, get_domain


FIELD_ALIASES = {
    "story_points": "customfield_13529",
    "qa_owner": "customfield_10500",
    "post_deploy_checks": "customfield_12100",
}


def parse_value(raw):
    """Parse VALUE as JSON first, then int, float, or plain string."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    try:
        return int(raw)
    except ValueError:
        pass
    try:
        return float(raw)
    except ValueError:
        pass
    return raw


def main():
    if len(sys.argv) != 4:
        print("Usage: jira_set_field.py <TICKET-ID> <FIELD-ID> <VALUE>", file=sys.stderr)
        sys.exit(1)

    ticket_id, field_id, raw_value = sys.argv[1], sys.argv[2], sys.argv[3]
    domain = get_domain()
    field_id = FIELD_ALIASES.get(field_id, field_id)
    value = parse_value(raw_value)
    auth = get_auth()

    body = json.dumps({"fields": {field_id: value}})
    result = subprocess.run([
        "curl", "-s", "-X", "PUT",
        f"https://{domain}/rest/api/2/issue/{ticket_id}",
        "-H", f"Authorization: Basic {auth}",
        "-H", "Content-Type: application/json",
        "-d", body
    ], capture_output=True, text=True)

    if result.stdout.strip():
        try:
            response = json.loads(result.stdout)
            if "errors" in response or "errorMessages" in response:
                print(f"Error: {result.stdout}", file=sys.stderr)
                sys.exit(1)
        except json.JSONDecodeError:
            pass

    print(f"✓ Set {field_id} on {ticket_id}")


if __name__ == "__main__":
    main()
