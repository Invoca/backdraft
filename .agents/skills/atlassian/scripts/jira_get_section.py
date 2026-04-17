#!/usr/bin/env python3
"""
Read a named wiki-markup section from a Jira ticket description.

Usage:
  python3 jira_get_section.py <TICKET-ID> <SECTION-HEADING>

Arguments:
  TICKET-ID        Jira ticket key (e.g., MON-428)
  SECTION-HEADING  The h2. heading text to find (e.g., "Risk Assessment")

Prints the content under the matching h2. section, or exits with code 1
if the section is not found.

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
    if "fields" not in data:
        print(f"Error fetching ticket: {result.stdout}", file=sys.stderr)
        sys.exit(1)
    return data["fields"]["description"] or ""


def extract_section(description, heading):
    # Match from "h2. <heading>" to the next h2. or end of string
    pattern = re.compile(
        rf"h2\. {re.escape(heading)}\n\n?(.*?)(?=\nh2\. |\Z)",
        re.DOTALL
    )
    match = pattern.search(description)
    if not match:
        return None
    return match.group(1).strip()


def main():
    if len(sys.argv) != 3:
        print("Usage: jira_get_section.py <TICKET-ID> <SECTION-HEADING>",
              file=sys.stderr)
        sys.exit(1)

    ticket_id, heading = sys.argv[1], sys.argv[2]
    domain = get_domain()
    auth = get_auth()

    description = fetch_description(ticket_id, domain, auth)
    content = extract_section(description, heading)

    if content is None:
        print(f"Section '{heading}' not found on {ticket_id}", file=sys.stderr)
        sys.exit(1)

    print(content)


if __name__ == "__main__":
    main()
