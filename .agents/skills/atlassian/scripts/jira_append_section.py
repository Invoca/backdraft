#!/usr/bin/env python3
"""
Append or replace a wiki-markup section in a Jira ticket description.

Usage:
  python3 jira_append_section.py <TICKET-ID> <SECTION-HEADING> <CONTENT>

Arguments:
  TICKET-ID        Jira ticket key (e.g., MON-428)
  SECTION-HEADING  The h2. heading text (e.g., "Risk Assessment")
  CONTENT          Wiki markup content to place under the heading

If a section with this heading already exists, it will be replaced.
If not, it will be appended.

Environment:
  JIRA_DOMAIN  Jira domain (default: invoca.atlassian.net)
"""
import sys
import os
import json
import re
import subprocess

sys.path.insert(0, os.path.dirname(__file__))
from jira_auth import get_auth, get_domain


def fetch_description(ticket_id, domain, auth):
    result = subprocess.run([
        "curl", "-s",
        f"https://{domain}/rest/api/2/issue/{ticket_id}?fields=description",
        "-H", f"Authorization: Basic {auth}"
    ], capture_output=True, text=True)
    data = json.loads(result.stdout)
    return data["fields"]["description"] or ""


def put_description(ticket_id, domain, auth, description):
    body = json.dumps({"fields": {"description": description}})
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


def replace_or_append(current, heading, content):
    section = f"h2. {heading}\n\n{content}"
    # Match from "h2. <heading>" to the next h2. or end of string
    pattern = re.compile(
        rf"h2\. {re.escape(heading)}\n.*?(?=\nh2\. |\Z)",
        re.DOTALL
    )
    if pattern.search(current):
        return pattern.sub(section, current)
    separator = "\n\n" if current.strip() else ""
    return current + separator + section


def main():
    if len(sys.argv) != 4:
        print("Usage: jira_append_section.py <TICKET-ID> <SECTION-HEADING> <CONTENT>",
              file=sys.stderr)
        sys.exit(1)

    ticket_id, heading, content = sys.argv[1], sys.argv[2], sys.argv[3]
    domain = get_domain()
    auth = get_auth()

    current = fetch_description(ticket_id, domain, auth)
    updated = replace_or_append(current, heading, content)
    put_description(ticket_id, domain, auth, updated)
    print(f"✓ Updated '{heading}' section on {ticket_id}")


if __name__ == "__main__":
    main()
