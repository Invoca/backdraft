#!/usr/bin/env python3
"""
Get the current user's Jira accountId.

Usage:
  python3 jira_get_account_id.py

Output: accountId string printed to stdout (e.g., 5b10a2844c20165700ede21g)

Useful when setting user-type fields like QA Owner (customfield_10500).

Environment:
  JIRA_DOMAIN  Jira domain (default: invoca.atlassian.net)
"""
import sys
import os
import json
import subprocess

sys.path.insert(0, os.path.dirname(__file__))
from jira_auth import get_auth, get_domain


def main():
    domain = get_domain()
    auth = get_auth()

    result = subprocess.run([
        "curl", "-s",
        f"https://{domain}/rest/api/2/myself",
        "-H", f"Authorization: Basic {auth}"
    ], capture_output=True, text=True)

    data = json.loads(result.stdout)
    if "accountId" not in data:
        print(f"Error: {result.stdout}", file=sys.stderr)
        sys.exit(1)

    print(data["accountId"])


if __name__ == "__main__":
    main()
