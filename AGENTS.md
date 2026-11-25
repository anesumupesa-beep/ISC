<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Accounts rule (mandatory for every agent)

For this project, use **only** the account `anesu.mupesa@umail.utm.ac.mu` — for Neon (console, CLI, MCP), GitHub (commits, remotes, PRs), and any other service or test account tied to ISC Connect. Never sign in with, commit as, or create resources under any other email. Git in this repo is configured locally with that email; don't override it.

The Neon CLI on this machine has that account under the profile `utm` (the DEFAULT profile is a different account). Always run Neon commands with `NEON_PROFILE=utm` set (or `--profile utm`), and confirm with `neon me` before creating anything.
