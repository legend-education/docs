---
name: humanize-text
description: Send text to the ai-text-humanizer.com API and return a humanized version. Use ONLY when the user explicitly asks to humanize, rewrite to bypass AI detection, or run text through the humanizer. Never invoke automatically as part of writing or editing.
disable-model-invocation: true
---

# Humanize Text

This skill wraps the [ai-text-humanizer.com](https://ai-text-humanizer.com/humanize-api/) API as a local script. It is a tool, not a writing style. Use it only when the user explicitly asks for humanized output.

## What it does

POSTs prose to `https://ai-text-humanizer.com/api.php` with three form fields:

- `email` — your account email
- `pw` — your account password
- `text` — the prose to humanize

The response body is the humanized text. Rate limit: 60 requests per minute. A PRO plan is required for API access.

## One-time setup

The API uses email + password auth. Store credentials in a `.env.local` file at the repo root (already gitignored):

```bash
# .env.local
AI_TEXT_HUMANIZER_EMAIL="you@example.com"
AI_TEXT_HUMANIZER_PW="your-password"
```

Load them into the current shell before running the script:

```bash
set -a; source .env.local; set +a
```

Never commit credentials. Never paste them into a prompt.

## Usage

From the repo root, with credentials loaded:

```bash
# from a file
python .cursor/skills/humanize-text/scripts/humanize.py < input.txt > output.txt

# from a pipe
echo "Some text to humanize." | python .cursor/skills/humanize-text/scripts/humanize.py

# from a heredoc
python .cursor/skills/humanize-text/scripts/humanize.py <<'EOF' > output.txt
Paragraph one.

Paragraph two.
EOF
```

The script reads all of stdin, sends it as one request, and writes the response to stdout. Errors go to stderr with a non-zero exit code.

## What NOT to send through the humanizer

Send only prose paragraphs. Strip these out first and stitch them back in after:

- YAML frontmatter (the `---` block at the top of MDX files)
- Code blocks (anything fenced with triple backticks)
- MDX components (`<Card>`, `<Steps>`, `<Accordion>`, `<CardGroup>`, `<Note>`, `<Tip>`, etc.)
- JSON-LD `<script type="application/ld+json">` blocks
- Tables (Markdown pipe tables and HTML tables)
- Citations and reference lists with URLs
- File paths, command snippets, code identifiers
- Standard codes like `CCSS.ELA-LITERACY.W.9-10.1.a` or `HS-LS1-1`

Run the humanizer one prose block at a time so you can put the file back together without breaking MDX rendering.

## Brand voice warning

The `legend-brand-voice` skill in this repo asks for short sentences, plain verbs, and direct claims. Humanizer output usually goes the other direction — longer sentences, qualifiers, indirect phrasing ("On the following lines, there is an explanation..."). The two are not chained.

If the final destination is teacher-facing copy in this repo, do a manual brand-voice editing pass **after** humanizing. Treat the humanizer output as a draft, not a final version.

## Troubleshooting

- `Missing AI_TEXT_HUMANIZER_EMAIL or AI_TEXT_HUMANIZER_PW env var.` — credentials not loaded into the shell. Run `set -a; source .env.local; set +a` and try again.
- HTTP errors come through as a non-zero exit and a message on stderr. Common causes: expired PRO plan, rate limit (60/min), wrong password.
- Empty output usually means an auth failure or an empty stdin. Check both.
