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
  - printing (and also saving to tools/fork-setup/bootstrap-output.sql,
    gitignored) a ready-to-run tenant bootstrap SQL script (paste into psql /
    Neon's SQL editor yourself — this tool never connects to a database,
    same convention as tools/admin-credential-tool): Tenant + SiteSettings +
    AboutPage + Home/About/Contact NavItems + any boards you asked for.
    This is the *whole* bootstrap, not just the Tenant row — the admin
    sidebar and public nav are both driven entirely by NavItem rows
    (src/app/admin/(dashboard)/layout.tsx), and Settings/About can't save
    without their own SiteSettings/AboutPage row already existing (both use
    Prisma `update`, not `upsert`) — a Tenant-only insert leaves a
    logged-in-but-empty admin panel with no Home/About/board links at all.

Everything docs/fork-checklist.md marks [manual] (Neon/R2/Vercel account
provisioning, DNS, real content) is out of scope by design.

Run:
    python main.py
    python main.py --site-name "Jane Doe Photography" --slug jane-doe \
        --contact-email jane@example.com --board Work --board "Prints:single" --yes
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

Built on the portfolio platform template. If `docs/` was kept
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

def sql_escape(value: str) -> str:
    return value.replace("'", "''")


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


def build_site_settings_insert(tenant_id: str, site_name: str, owner_name: str,
                                contact_email: str) -> str:
    return (
        'INSERT INTO "SiteSettings" (id, "tenantId", "siteName", "ownerName", "contactEmail")\n'
        "VALUES (\n"
        f"  '{uuid.uuid4()}',\n"
        f"  '{tenant_id}',\n"
        f"  '{sql_escape(site_name)}',\n"
        f"  '{sql_escape(owner_name)}',\n"
        f"  '{sql_escape(contact_email)}'\n"
        ");"
    )


def build_about_page_insert(tenant_id: str) -> str:
    return (
        'INSERT INTO "AboutPage" (id, "tenantId", content)\n'
        "VALUES (\n"
        f"  '{uuid.uuid4()}',\n"
        f"  '{tenant_id}',\n"
        "  ''\n"
        ");"
    )


def build_nav_item_insert(tenant_id: str, label: str, target_kind: str, order: int,
                           target_board_id: str | None = None) -> str:
    target_board_sql = f"'{target_board_id}'" if target_board_id else "NULL"
    return (
        'INSERT INTO "NavItem" (id, "tenantId", label, "targetKind", "targetBoardId", "order", "isVisible")\n'
        "VALUES (\n"
        f"  '{uuid.uuid4()}',\n"
        f"  '{tenant_id}',\n"
        f"  '{sql_escape(label)}',\n"
        f"  '{target_kind}',\n"
        f"  {target_board_sql},\n"
        f"  {order},\n"
        "  true\n"
        ");"
    )


def build_board_insert(board_id: str, tenant_id: str, seq: int, name: str, kind: str, order: int) -> str:
    return (
        'INSERT INTO "Board" (id, "tenantId", seq, name, kind, "order", "isPublished")\n'
        "VALUES (\n"
        f"  '{board_id}',\n"
        f"  '{tenant_id}',\n"
        f"  {seq},\n"
        f"  '{sql_escape(name)}',\n"
        f"  '{kind}',\n"
        f"  {order},\n"
        "  true\n"
        ");"
    )


def prompt_for_boards() -> list[dict]:
    # HOME/ABOUT/CONTACT nav entries always get created (site is non-
    # functional without them — the admin sidebar and public nav both read
    # NavItem, not a hardcoded list, see src/app/admin/(dashboard)/layout.tsx).
    # Boards are the one genuinely optional/variable part, so this is the
    # only piece worth prompting for interactively.
    boards: list[dict] = []
    print()
    print("Boards are how visitors browse your work (e.g. a gallery of shoots).")
    print("Add as many as you want now, or skip and add more later via SQL.")
    while True:
        add = input(f"Add a board? (currently {len(boards)}) [y/N]: ").strip().lower()
        if add not in ("y", "yes"):
            break
        name = input("  Board name (e.g. 'Work'): ").strip()
        if not name:
            print("  (empty name, skipping)")
            continue
        kind_in = input(
            "  Kind — [1] multi-photo gallery with its own detail page (default)"
            "  [2] single-photo grid tile only: "
        ).strip()
        kind = "GALLERY_SINGLE" if kind_in == "2" else "GALLERY_MULTI"
        boards.append({"name": name, "kind": kind})
    return boards


def parse_board_flag(value: str) -> dict:
    if value.lower().endswith(":single"):
        return {"name": value[: -len(":single")].strip(), "kind": "GALLERY_SINGLE"}
    return {"name": value.strip(), "kind": "GALLERY_MULTI"}


def print_bootstrap_sql(slug: str, site_name: str, owner_name: str,
                         contact_email: str, boards: list[dict], dry_run: bool) -> None:
    tenant_id = str(uuid.uuid4())
    print("Step 4: full tenant bootstrap SQL (run this yourself in psql / Neon's SQL")
    print("        editor — this tool never connects to a database). The site is a")
    print("        blank/unreachable admin panel until all of this exists, not just")
    print("        the Tenant row — the admin sidebar and public nav are both driven")
    print("        entirely by NavItem rows, and Settings/About can't save without")
    print("        their own SiteSettings/AboutPage row. Paste the whole block at")
    print("        once:")
    print()

    statements = [
        build_tenant_insert_sql(tenant_id, slug),
        build_site_settings_insert(tenant_id, site_name, owner_name, contact_email),
        build_about_page_insert(tenant_id),
        build_nav_item_insert(tenant_id, "Home", "HOME", 0),
        build_nav_item_insert(tenant_id, "About", "ABOUT", 1),
        build_nav_item_insert(tenant_id, "Contact", "CONTACT", 2),
    ]

    for i, board in enumerate(boards, start=1):
        board_id = str(uuid.uuid4())
        statements.append(build_board_insert(board_id, tenant_id, i, board["name"], board["kind"], i - 1))
        statements.append(build_nav_item_insert(tenant_id, board["name"], "BOARD", 2 + i, target_board_id=board_id))

    sql_text = "\n\n".join(statements) + "\n"

    print(sql_text)
    if not boards:
        print("  (0 boards — the site will show Home/About/Contact but no galleries")
        print("   yet. Add one later by copying this script's Board+NavItem INSERT")
        print("   pattern, with a new seq/order.)")
    print(f"  tenant id for reference (also needed by tools/admin-credential-tool")
    print(f"  when creating this tenant's admin user, before you delete that tool): {tenant_id}")

    # Printing alone isn't enough — owner-name/contact-email/board names only
    # ever existed as prompt input up to this point, and terminal scrollback
    # is easy to lose (closed window, cleared buffer) before this SQL
    # actually gets pasted into Neon. Persist it too, gitignored so it never
    # gets committed even if tools/ isn't deleted before a first commit.
    output_path = REPO_ROOT / "tools" / "fork-setup" / "bootstrap-output.sql"
    print()
    if dry_run:
        print(f"  [dry-run] would also save this to {output_path.relative_to(REPO_ROOT)}")
        return
    output_path.write_text(sql_text, encoding="utf-8")
    print(f"  Also saved to {output_path.relative_to(REPO_ROOT)} — safe to delete once")
    print("  you've pasted the SQL into Neon and confirmed it applied.")


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
        ).strip() or f"{args.site_name} — portfolio"
    if not args.package_name:
        args.package_name = args.slug
    if not args.owner_name:
        args.owner_name = input(
            "Owner name (SiteSettings.ownerName, shown on the site): "
        ).strip() or args.site_name
    if not args.contact_email:
        while True:
            email = input("Contact email (where contact-form submissions reference; required): ").strip()
            if "@" in email:
                args.contact_email = email
                break
            print("  needs to look like an email address, try again")


def collect_boards(args: argparse.Namespace) -> list[dict]:
    if args.board:
        return [parse_board_flag(b) for b in args.board]
    if args.yes:
        return []
    return prompt_for_boards()


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
    parser.add_argument("--owner-name", help="SiteSettings.ownerName (default: --site-name)")
    parser.add_argument("--contact-email", help="SiteSettings.contactEmail (required, no default)")
    parser.add_argument(
        "--board", action="append",
        help="Add a board to the bootstrap SQL, e.g. --board Work (repeatable). "
             "Suffix ':single' for a GALLERY_SINGLE board, e.g. --board 'Snapshots:single'. "
             "If omitted entirely and --yes is set, no boards are created.",
    )
    parser.add_argument("--yes", action="store_true", help="assume yes on confirmation prompts")
    parser.add_argument("--dry-run", action="store_true", help="print planned changes, write nothing")
    parser.add_argument("--skip-delete", action="store_true", help="skip step 1 (deletions)")
    parser.add_argument("--skip-readme", action="store_true", help="skip regenerating README.md")
    parser.add_argument("--force-secrets", action="store_true",
                         help="overwrite AUTH_SECRET/ENCRYPTION_KEY even if already set in .env")
    args = parser.parse_args()

    guard_against_master_repo()
    prompt_for_missing(args)
    boards = collect_boards(args)

    print()
    print(f"Site name:         {args.site_name}")
    print(f"Slug:              {args.slug}")
    print(f"Description:       {args.description}")
    print(f"package name:      {args.package_name}")
    print(f"Owner name:        {args.owner_name}")
    print(f"Contact email:     {args.contact_email}")
    print(f"Boards:            {', '.join(b['name'] for b in boards) or '(none)'}")
    print(f"Repo root:         {REPO_ROOT}")
    print()

    if not args.skip_delete:
        delete_master_only_content(args.dry_run, args.yes)
    write_secrets(args.dry_run, args.force_secrets)
    apply_branding(args.site_name, args.slug, args.description, args.package_name,
                    args.dry_run, args.yes, args.skip_readme)
    print_bootstrap_sql(args.slug, args.site_name, args.owner_name, args.contact_email, boards, args.dry_run)

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
