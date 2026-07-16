# Admin credential generator

> **Master-project-only. Do NOT copy this folder into a customer fork.**
> This repo is a dev master template — each customer gets their own forked
> copy/deployment (see `docs/decisions.md`'s "Per-customer fork" entry).
> Customers are intentionally never given a way to self-provision admin
> accounts. Delete `tools/` entirely when cutting a customer fork.

Local desktop tool (Tkinter) that generates the bcrypt hash + `INSERT`
statement for a `User` row — for when you need an admin login and don't want
to hand-write the hash yourself. Fully local: no DB connection, no `.env`
reads. You run the generated SQL yourself in psql / Neon's SQL editor.

## Setup

```
pip install -r requirements.txt
python main.py
```

## What it does

- Email + password fields, each with a "Random" generator or type your own.
- Hashes the password with bcrypt (10 rounds — matches `src/lib/auth/auth.ts`'s
  `bcrypt.compare`).
- Pick a role (`TENANT_OWNER` / `TENANT_ADMIN` / `PLATFORM_SUPERADMIN`) and,
  for tenant-scoped roles, type in the tenant's uuid (find it via
  `SELECT id FROM "Tenant" WHERE slug = '...';`, or the seed script's console
  output).
- "Generate hash + SQL" builds the hash and a ready-to-run `INSERT` statement
  — copy either one with the Copy buttons.

The plain-text password is only ever shown in this tool — it's not
recoverable once you close the window, so copy it before closing.
