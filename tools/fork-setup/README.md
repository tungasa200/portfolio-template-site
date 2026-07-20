# Fork setup

> **Master-project-only. Do NOT copy this folder into a customer fork.**
> This repo is a dev master template — each customer gets their own forked
> copy/deployment (see `docs/decisions.md`'s "Per-customer fork" entry).
> Delete `tools/` entirely (including this script) once you're done setting
> up the fork.

CLI script that automates the **[auto]**-tagged rows of
[`docs/fork-checklist.md`](../../docs/fork-checklist.md) — the mechanical
steps that don't need an external account login. Everything tagged
**[manual]** there (Neon/R2/Vercel account provisioning, DNS, real content)
is out of scope by design: no script can create accounts on services it
isn't logged into.

Pure Python standard library — no `pip install`, no third-party
dependencies, no DB connection (same convention as
`tools/admin-credential-tool`: it prints SQL for you to run yourself rather
than connecting to a database directly).

## Setup

```
python main.py
```

No `requirements.txt` — nothing to install.

## Usage

Interactive (prompts for anything not passed as a flag):

```
python main.py
```

Non-interactive, e.g. for a repeatable/scripted fork cut:

```
python main.py --site-name "Jane Doe Photography" --slug jane-doe --yes
```

Preview without changing anything:

```
python main.py --dry-run
```

| Flag | Meaning |
|---|---|
| `--site-name` | Human display name (layout.tsx `<title>`, README) |
| `--slug` | Tenant slug — lowercase, hyphens only (e.g. `jane-doe`) |
| `--description` | Site description (`<meta>` tag + README); defaults to `"{site-name} — photographer portfolio"` |
| `--package-name` | `package.json` `"name"` override; defaults to `--slug` |
| `--yes` | Assume yes on confirmation prompts |
| `--dry-run` | Print planned changes, write nothing |
| `--skip-delete` | Skip step 1 (deleting `tools/admin-credential-tool/`, `design/`, `.claude/settings.local.json`) |
| `--skip-readme` | Skip regenerating `README.md` |
| `--force-secrets` | Overwrite `AUTH_SECRET`/`ENCRYPTION_KEY` in `.env` even if already set |

## What it does

1. **Deletes master-only content** — `tools/admin-credential-tool/`,
   `design/`, `.claude/settings.local.json` — with a confirmation prompt
   (skippable with `--skip-delete`).
2. **Generates `AUTH_SECRET`/`ENCRYPTION_KEY`** into `.env` (creating it from
   `.env.example` first if missing). Won't clobber values you've already
   filled in unless `--force-secrets` is passed. Reminds you these also need
   to go into Vercel's env vars — that part is manual.
3. **Patches branding**: `package.json`'s `"name"`, `layout.tsx`'s
   `metadata.title`/`metadata.description`, and regenerates `README.md` from
   a small fork-specific template (confirmation prompt, skippable with
   `--skip-readme`).
4. **Prints a `Tenant` `INSERT` statement** — copy it into psql / Neon's SQL
   editor yourself. Also prints the generated tenant id, which you'll need
   again in `tools/admin-credential-tool` when creating that tenant's first
   admin user (do that before deleting `tools/`).

## Safety

- Refuses to run against what looks like the *original* master repo (checks
  `git remote get-url origin` for `portfolio-template-site`) unless you type
  an explicit confirmation phrase — this script deletes folders and rewrites
  files in place, and running it against the master by mistake would do
  that to the master, not a fork.
- `--dry-run` prints every planned change without touching disk.
- Re-running is safe: secret generation and file deletion both no-op (with
  a message) if there's nothing left to do, unless you force them.

## What it deliberately does NOT do

Everything `docs/fork-checklist.md` tags **[manual]**:

- Create the Neon project/database, run `create-app-role.sql`/`rls.sql`, or
  apply migrations — those need a real connection string this tool doesn't
  have.
- Create the R2 bucket/API token, or set its CORS policy.
- Create the Vercel project or set its env vars.
- Buy/point the real domain, or verify DNS.
- Trim development-history comments in `docs/*.md`/`.env.example`/Prisma
  files — that's a judgment call about what history is safe to lose, not a
  mechanical strip.
- Populate real site content — that's the customer's actual photos/text.

See [`docs/fork-checklist.md`](../../docs/fork-checklist.md) for the full
list with those steps spelled out.
