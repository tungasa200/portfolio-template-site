"""Fork setup — automates the [auto] rows of docs/fork-checklist.md.

Master-project tooling only (like tools/admin-credential-tool) — see
docs/decisions.md's "Per-customer fork" entry. Run this from inside the
*forked copy* of the repo, not this master, and delete the whole tools/
folder (including this script) once you're done, per
docs/fork-checklist.md's section 1.

Handles, all stdlib / no DB connection / no pip install:
  - deleting master-only folders (tools/admin-credential-tool, design/,
    .claude/settings.local.json)
  - generating AUTH_SECRET / ENCRYPTION_KEY into .env
  - patching package.json's "name" and layout.tsx's metadata title/description
  - regenerating README.md for the fork
  - printing a ready-to-run Tenant INSERT statement (paste into psql /
    Neon's SQL editor yourself — this tool never connects to a database,
    same convention as tools/admin-credential-tool)

Everything docs/fork-checklist.md marks [manual] (Neon/R2/Vercel account
provisioning, DNS, real content) is out of scope by design.

Run:
    python main.py
    python main.py --site-name "Jane Doe Photography" --slug jane-doe --yes
    python main.py --dry-run
"""

from __future__ import annotations

import argparse
import base64
import re
import secrets
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

# Windows consoles default to a legacy codepage (e.g. cp949) that can't
# encode the em-dashes used throughout this script's output — force UTF-8
# regardless of platform default.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MASTER_REPO_MARKER = "portfolio-template-site"

SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


# --------------------------------------------------------------------- io ---

def confirm(prompt: str, assume_yes: bool) -> bool:
    if assume_yes:
        print(f"{prompt} [auto-yes]")
        return True
    answer = input(f"{prompt} [y/N]: ").strip().lower()
    return answer in ("y", "yes")


def guard_against_master_repo() -> None:
    try:
        origin = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            cwd=REPO_ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
    except Exception:
        origin = None

    if origin and MASTER_REPO_MARKER in origin:
        print("!! This looks like the ORIGINAL dev master repo")
        print(f"   (git origin: {origin}).")
        print("   fork-setup deletes tools/admin-credential-tool/ and design/, and")
        print("   rewrites package.json / layout.tsx / README.md in place — running")
        print("   it here would do that to the MASTER project, not a customer fork.")
        answer = input('   Type "I am not in the master repo" to continue anyway: ')
        if answer.strip() != "I am not in the master repo":
            print("Aborted.")
            sys.exit(1)
    elif origin is None:
        print(f"(Could not determine git origin under {REPO_ROOT} — make sure this")
        print(" is a forked copy, not the master, before continuing.)")


# ------------------------------------------------------------- deletions ---

def delete_master_only_content(dry_run: bool, assume_yes: bool) -> None:
    targets = [
        REPO_ROOT / "tools" / "admin-credential-tool",
        REPO_ROOT / "design",
        REPO_ROOT / ".claude" / "settings.local.json",
    ]
    existing = [t for t in targets if t.exists()]
    if not existing:
        print("Step 1: nothing to delete (already absent).")
        return

    print("Step 1: delete master-only content:")
    for t in existing:
        print(f"  - {t.relative_to(REPO_ROOT)}")

    if dry_run:
        print("  [dry-run] skipping actual deletion")
        return
    if not confirm("Delete the above?", assume_yes):
        print("  skipped")
        return

    for t in existing:
        if t.is_dir():
            shutil.rmtree(t)
        else:
            t.unlink()
        print(f"  deleted {t.relative_to(REPO_ROOT)}")


# -------------------------------------------------------------- secrets ---

def generate_secret() -> str:
    return base64.b64encode(secrets.token_bytes(32)).decode("ascii")


def set_env_var(env_text: str, key: str, value: str, force: bool) -> tuple[str, bool]:
    pattern = re.compile(rf'^{re.escape(key)}="(.*)"$', re.MULTILINE)
    match = pattern.search(env_text)
    if match is None:
        print(f"  WARNING: {key} not found in .env, appending it")
        new_text = env_text.rstrip("\n") + f'\n{key}="{value}"\n'
        return new_text, True

    if match.group(1) and not force:
        print(f"  {key} already set, leaving as-is (use --force-secrets to overwrite)")
        return env_text, False

    new_text = pattern.sub(f'{key}="{value}"', env_text, count=1)
    return new_text, True


def write_secrets(dry_run: bool, force: bool) -> None:
    print("Step 2: generate AUTH_SECRET / ENCRYPTION_KEY into .env")
    env_path = REPO_ROOT / ".env"
    example_path = REPO_ROOT / ".env.example"

    if not env_path.exists():
        if not example_path.exists():
            print("  WARNING: neither .env nor .env.example exist, skipping")
            return
        if dry_run:
            print("  [dry-run] would create .env from .env.example")
            return
        shutil.copy(example_path, env_path)
        print("  created .env from .env.example")

    text = env_path.read_text(encoding="utf-8")
    text, changed_auth = set_env_var(text, "AUTH_SECRET", generate_secret(), force)
    text, changed_enc = set_env_var(text, "ENCRYPTION_KEY", generate_secret(), force)

    if dry_run:
        print("  [dry-run] would write updated .env")
        return
    if changed_auth or changed_enc:
        env_path.write_text(text, encoding="utf-8")
        print("  .env updated")
    print("  reminder: also paste these into the Vercel project's env vars "
          "([manual] — see docs/fork-checklist.md section 3)")


# -------------------------------------------------------------- branding ---

def ts_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def patch_package_json(package_name: str, dry_run: bool) -> None:
    path = REPO_ROOT / "package.json"
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(r'("name":\s*")[^"]*(")')
    if not pattern.search(text):
        print("  WARNING: couldn't find \"name\" in package.json, skipping")
        return
    new_text = pattern.sub(rf"\g<1>{package_name}\g<2>", text, count=1)
    if dry_run:
        print(f"  [dry-run] package.json name -> {package_name}")
        return
    path.write_text(new_text, encoding="utf-8")
    print(f"  package.json name -> {package_name}")


def patch_layout_metadata(title: str, description: str, dry_run: bool) -> None:
    path = REPO_ROOT / "src" / "app" / "layout.tsx"
    text = path.read_text(encoding="utf-8")

    text, n_title = re.subn(
        r'(title:\s*")[^"]*(")', rf"\g<1>{ts_escape(title)}\g<2>", text, count=1
    )
    text, n_desc = re.subn(
        r'(description:\s*")[^"]*(")', rf"\g<1>{ts_escape(description)}\g<2>", text, count=1
    )
    if n_title == 0 or n_desc == 0:
        print("  WARNING: couldn't find title/description in layout.tsx metadata, "
              "edit it by hand")
        return
    if dry_run:
        print(f'  [dry-run] layout.tsx metadata.title -> "{title}"')
        print(f'  [dry-run] layout.tsx metadata.description -> "{description}"')
        return
    path.write_text(text, encoding="utf-8")
    print(f'  layout.tsx metadata.title -> "{title}"')
    print(f'  layout.tsx metadata.description -> "{description}"')


def generate_readme(site_name: str, slug: str, description: str) -> str:
    return f"""# {site_name}

{description}

Built on the photographer portfolio platform template. If `docs/` was kept
in this fork, see it for architecture notes; if it was dropped per
`docs/fork-checklist.md`, refer back to the master template's docs.

## Local development

```bash
npm install
cp .env.example .env   # fill in real values
npm run dev
```

Visit `http://{slug}.localhost:3000` (public site) and
`http://admin.localhost:3000` (admin panel).
"""


def write_readme(site_name: str, slug: str, description: str, dry_run: bool, assume_yes: bool) -> None:
    print("Step 3b: regenerate README.md")
    path = REPO_ROOT / "README.md"
    new_text = generate_readme(site_name, slug, description)

    if dry_run:
        print("  [dry-run] would overwrite README.md with a fork-specific starter")
        return
    if not confirm("Overwrite README.md with a fork-specific starter?", assume_yes):
        print("  skipped")
        return
    path.write_text(new_text, encoding="utf-8")
    print("  README.md regenerated")


def apply_branding(site_name: str, slug: str, description: str, package_name: str,
                    dry_run: bool, assume_yes: bool, skip_readme: bool) -> None:
    print("Step 3: update hardcoded branding")
    patch_package_json(package_name, dry_run)
    patch_layout_metadata(site_name, description, dry_run)
    if not skip_readme:
        write_readme(site_name, slug, description, dry_run, assume_yes)


# ---------------------------------------------------------------- tenant ---

def build_tenant_insert_sql(tenant_id: str, slug: str) -> str:
    return (
        'INSERT INTO "Tenant" '
        '(id, slug, "customDomain", "customDomainStatus", "planTier", "createdAt", "updatedAt")\n'
        "VALUES (\n"
        f"  '{tenant_id}',\n"
        f"  '{slug}',\n"
        "  NULL,\n"
        "  'NONE',\n"
        "  'FREE',\n"
        "  now(),\n"
        "  now()\n"
        ");"
    )


def print_tenant_sql(slug: str) -> None:
    tenant_id = str(uuid.uuid4())
    print("Step 4: real Tenant row (run this yourself in psql / Neon's SQL editor —")
    print("        this tool never connects to a database):")
    print()
    print(build_tenant_insert_sql(tenant_id, slug))
    print()
    print(f"  tenant id for reference (also needed by tools/admin-credential-tool")
    print(f"  when creating this tenant's admin user, before you delete that tool): {tenant_id}")


# ------------------------------------------------------------------ main ---

def validate_slug(slug: str) -> str:
    if not SLUG_RE.match(slug):
        raise argparse.ArgumentTypeError(
            "slug must be lowercase alphanumeric with single hyphens, e.g. 'jane-doe'"
        )
    return slug


def prompt_for_missing(args: argparse.Namespace) -> None:
    if not args.site_name:
        args.site_name = input("Site name (e.g. 'Jane Doe Photography'): ").strip()
    if not args.slug:
        while True:
            slug = input("Tenant slug (e.g. 'jane-doe'): ").strip()
            if SLUG_RE.match(slug):
                args.slug = slug
                break
            print("  slug must be lowercase alphanumeric with single hyphens, try again")
    if not args.description:
        args.description = input(
            "Site description (blank ok, used in <meta> tags + README): "
        ).strip() or f"{args.site_name} — photographer portfolio"
    if not args.package_name:
        args.package_name = args.slug


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Automate the [auto] rows of docs/fork-checklist.md for a new "
                     "customer fork.",
        epilog="See docs/fork-checklist.md for the full checklist, including the "
               "[manual] steps this tool does not and cannot do.",
    )
    parser.add_argument("--site-name", help="Human display name, e.g. 'Jane Doe Photography'")
    parser.add_argument("--slug", type=validate_slug, help="Tenant slug, e.g. 'jane-doe'")
    parser.add_argument("--description", help="Site description for <meta> tags + README")
    parser.add_argument("--package-name", help="package.json \"name\" override (default: slug)")
    parser.add_argument("--yes", action="store_true", help="assume yes on confirmation prompts")
    parser.add_argument("--dry-run", action="store_true", help="print planned changes, write nothing")
    parser.add_argument("--skip-delete", action="store_true", help="skip step 1 (deletions)")
    parser.add_argument("--skip-readme", action="store_true", help="skip regenerating README.md")
    parser.add_argument("--force-secrets", action="store_true",
                         help="overwrite AUTH_SECRET/ENCRYPTION_KEY even if already set in .env")
    args = parser.parse_args()

    guard_against_master_repo()
    prompt_for_missing(args)

    print()
    print(f"Site name:    {args.site_name}")
    print(f"Slug:         {args.slug}")
    print(f"Description:  {args.description}")
    print(f"package name: {args.package_name}")
    print(f"Repo root:    {REPO_ROOT}")
    print()

    if not args.skip_delete:
        delete_master_only_content(args.dry_run, args.yes)
    write_secrets(args.dry_run, args.force_secrets)
    apply_branding(args.site_name, args.slug, args.description, args.package_name,
                    args.dry_run, args.yes, args.skip_readme)
    print_tenant_sql(args.slug)

    print()
    print("Done with the [auto] steps. Still [manual] — see docs/fork-checklist.md:")
    print("  - section 2: Neon / R2 / Vercel account provisioning")
    print("  - section 3: DATABASE_URL/DIRECT_URL/R2_* values, Vercel env vars, R2 CORS")
    print("  - section 5: trimming development-history comments (judgment call)")
    print("  - section 6: DNS, real content, live verification")
    print()
    print("When finished, delete the whole tools/ folder (including this script) —")
    print("see docs/fork-checklist.md section 1.")


if __name__ == "__main__":
    main()
