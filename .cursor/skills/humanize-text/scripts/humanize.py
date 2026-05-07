#!/usr/bin/env python3
"""Humanize text via the ai-text-humanizer.com API.

Reads text from stdin, POSTs to https://ai-text-humanizer.com/api.php with
email + password auth from environment variables, and writes the humanized
response to stdout. Errors are written to stderr with a non-zero exit code.

Environment variables:
    AI_TEXT_HUMANIZER_EMAIL  Account email
    AI_TEXT_HUMANIZER_PW     Account password

Usage:
    python humanize.py < input.txt > output.txt
    echo "text" | python humanize.py
"""

import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API_URL = "https://ai-text-humanizer.com/api.php"
TIMEOUT_SECONDS = 60


def main() -> int:
    email = os.environ.get("AI_TEXT_HUMANIZER_EMAIL")
    pw = os.environ.get("AI_TEXT_HUMANIZER_PW")
    if not email or not pw:
        sys.stderr.write(
            "Missing AI_TEXT_HUMANIZER_EMAIL or AI_TEXT_HUMANIZER_PW env var.\n"
        )
        return 2

    text = sys.stdin.read()
    if not text.strip():
        sys.stderr.write("No input text on stdin.\n")
        return 2

    data = urllib.parse.urlencode(
        {"email": email, "pw": pw, "text": text}
    ).encode("utf-8")
    req = urllib.request.Request(API_URL, data=data, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            sys.stdout.write(resp.read().decode("utf-8", errors="replace"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
        sys.stderr.write(f"HTTP {exc.code} from humanizer API: {body}\n")
        return 1
    except urllib.error.URLError as exc:
        sys.stderr.write(f"Network error reaching humanizer API: {exc.reason}\n")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
