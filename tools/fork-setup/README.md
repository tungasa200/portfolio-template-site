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

Non-interactive, e.g. for a repeatable/scripted fork cut (`--contact-email` is
required — the script still blocks on a prompt for it if omitted, `--yes`
only skips confirmation prompts, not required-value prompts):

```
python main.py --site-name "Jane Doe Photography" --slug jane-doe \
    --contact-email jane@example.com --board Work --board "Prints:single" --yes
```

Preview without changing anything:

```
python main.py --dry-run
```

| Flag | Meaning |
|---|---|
| `--site-name` | Human display name (layout.tsx `<title>`, README, `SiteSettings.siteName`) |
| `--slug` | Tenant slug — lowercase, hyphens only (e.g. `jane-doe`) |
| `--description` | Site description (`<meta>` tag + README); defaults to `"{site-name} — portfolio"` |
| `--package-name` | `package.json` `"name"` override; defaults to `--slug` |
| `--owner-name` | `SiteSettings.ownerName`; defaults to `--site-name` |
| `--contact-email` | `SiteSettings.contactEmail` — required, no default (contact-form recipient) |
| `--board` | Add a board to the bootstrap SQL, repeatable, e.g. `--board Work --board "Prints:single"`. No suffix = `GALLERY_MULTI` (multi-photo, own detail page); `:single` suffix = `GALLERY_SINGLE` (single photo, grid tile only, no detail page). If omitted and `--yes` is set, no boards are created — add them later by hand. |
| `--yes` | Assume yes on confirmation prompts |
| `--dry-run` | Print planned changes, write nothing |
| `--skip-delete` | Skip step 1 (deleting `tools/admin-credential-tool/`, `design/`, `.claude/settings.local.json`) |
| `--skip-readme` | Skip regenerating `README.md` |
| `--force-secrets` | Overwrite `AUTH_SECRET`/`ENCRYPTION_KEY` in `.env` even if already set |

Interactive mode (no `--owner-name`/`--contact-email`) prompts for
both; interactive mode with no `--board` flags at all prompts to add boards
one at a time (name + kind). Pass `--yes` for a non-interactive run — with
`--yes` and no `--board` flags, the bootstrap SQL creates 0 boards (Home/
About/Contact only), not an error.

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
4. **Prints a full tenant bootstrap SQL script** — copy the whole block into
   psql / Neon's SQL editor and run it in one go. This is not just a
   `Tenant` row: it also inserts `SiteSettings`, `AboutPage`, the Home/About/
   Contact `NavItem` rows, and one `Board` + `NavItem` pair per `--board`.
   **All of these are required for a working admin panel/site, not optional
   extras** — the admin sidebar and public nav are both driven entirely by
   `NavItem` rows (`src/app/admin/(dashboard)/layout.tsx`), and the Settings/
   About forms call Prisma `update` (not `upsert`), so they error out with no
   pre-existing `SiteSettings`/`AboutPage` row. A `Tenant`-only insert (this
   tool's original behavior) leaves you logged into an admin panel with only
   "메시지"/"설정" in the sidebar and a Settings form that fails to save.
   Also prints the generated tenant id, which you'll need again in
   `tools/admin-credential-tool` when creating that tenant's first admin user
   (do that before deleting `tools/`).

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
