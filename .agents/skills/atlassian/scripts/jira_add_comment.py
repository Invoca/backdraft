#!/usr/bin/env python3
"""
Add a comment to a Jira ticket.

Usage:
  python3 jira_add_comment.py <TICKET-ID> <COMMENT-BODY>

Arguments:
  TICKET-ID     Jira ticket key (e.g., MON-428)
  COMMENT-BODY  Wiki markup comment text

Environment:
  JIRA_DOMAIN  Jira domain (default: invoca.atlassian.net)
"""
import sys
import os
import json
import subprocess

sys.path.insert(0, os.path.dirname(__file__))
from jira_auth import get_auth, get_domain


def add_comment(ticket_id, body_text, domain, auth):
    body = json.dumps({"body": body_text})
    result = subprocess.run([
        "curl", "-s", "-X", "POST",
        f"https://{domain}/rest/api/2/issue/{ticket_id}/comment",
        "-H", f"Authorization: Basic {auth}",
        "-H", "Content-Type: application/json",
        "-d", body
    ], capture_output=True, text=True)
    return json.loads(result.stdout)


def main():
    if len(sys.argv) != 3:
        print("Usage: jira_add_comment.py <TICKET-ID> <COMMENT-BODY>", file=sys.stderr)
        sys.exit(1)

    ticket_id, comment_body = sys.argv[1], sys.argv[2]
    domain = get_domain()
    auth = get_auth()

    data = add_comment(ticket_id, comment_body, domain, auth)

    if "id" in data:
        print(f"✓ Comment added to {ticket_id} (id: {data['id']})")
    else:
        print(f"Error: {json.dumps(data)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
