"""
TeamForge — GitHub Service

Handles HMAC-SHA256 webhook signature verification and diff parsing.
"""

import hashlib
import hmac
from typing import Optional

import httpx
from config import settings


def verify_signature(body: bytes, signature_header: str) -> bool:
    """
    Verify the HMAC-SHA256 signature sent by GitHub on webhook payloads.

    GitHub sends the signature as `sha256=<hex_digest>` in the
    X-Hub-Signature-256 header.

    Args:
        body:             Raw request body bytes.
        signature_header: Value of the X-Hub-Signature-256 header.

    Returns:
        True if the signature is valid, False otherwise.
    """
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected_sig = signature_header[len("sha256="):]
    computed = hmac.new(
        settings.GITHUB_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    # Use compare_digest to prevent timing attacks
    return hmac.compare_digest(computed, expected_sig)


async def fetch_pull_request_diff(diff_url: str) -> Optional[str]:
    """
    Fetch the unified diff of a GitHub pull request.

    Args:
        diff_url: The URL of the PR diff (e.g. https://github.com/.../pull/1.diff).

    Returns:
        Diff string, or None if the request fails.
    """
    headers = {"Accept": "application/vnd.github.v3.diff"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(diff_url, headers=headers)
            response.raise_for_status()
            return response.text
        except httpx.HTTPError:
            return None


def extract_commits_from_push(payload: dict) -> list[dict]:
    """
    Extract commit information from a GitHub push event payload.

    Args:
        payload: Parsed JSON payload from the push webhook.

    Returns:
        List of dicts with keys: sha, message, author, url, added, removed, modified.
    """
    commits = []
    for commit in payload.get("commits", []):
        commits.append({
            "sha": commit.get("id", "")[:8],
            "message": commit.get("message", ""),
            "author": commit.get("author", {}).get("name", "Unknown"),
            "url": commit.get("url", ""),
            "added": commit.get("added", []),
            "removed": commit.get("removed", []),
            "modified": commit.get("modified", []),
        })
    return commits


def build_commit_diff_text(commit: dict) -> str:
    """
    Build a pseudo-diff summary string from a commit object for AI summarisation.

    Args:
        commit: Commit dict from extract_commits_from_push().

    Returns:
        Formatted string describing the commit changes.
    """
    lines = [
        f"Commit: {commit['sha']}",
        f"Author: {commit['author']}",
        f"Message: {commit['message']}",
    ]
    if commit["added"]:
        lines.append(f"Added files: {', '.join(commit['added'])}")
    if commit["modified"]:
        lines.append(f"Modified files: {', '.join(commit['modified'])}")
    if commit["removed"]:
        lines.append(f"Removed files: {', '.join(commit['removed'])}")
    return "\n".join(lines)
