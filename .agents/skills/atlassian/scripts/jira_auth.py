"""Shared Jira auth helpers — imported by other scripts in this directory."""
import subprocess
import os
import base64


def get_auth():
    """Return Base64-encoded Basic auth string using git user email + keychain token."""
    jira_user = subprocess.check_output(
        ["git", "config", "user.email"], text=True
    ).strip()
    jira_token = subprocess.check_output(
        ["security", "find-generic-password",
         "-s", "atlassian-api-token",
         "-a", jira_user, "-w"],
        text=True
    ).strip()
    return base64.b64encode(f"{jira_user}:{jira_token}".encode()).decode()


def get_domain():
    """Return Jira domain from JIRA_DOMAIN env var, defaulting to invoca.atlassian.net."""
    return os.environ.get("JIRA_DOMAIN", "invoca.atlassian.net")
