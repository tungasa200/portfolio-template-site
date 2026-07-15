const FIXED_HREF: Record<string, string> = {
  HOME: "/",
  ABOUT: "/about",
  CONTACT: "/contact",
};

interface NavItemLike {
  targetKind: string;
  targetBoard: { seq: number; name: string } | null;
  url: string | null;
  label: string;
}

export function resolveNavHref(item: NavItemLike): string {
  if (item.targetKind === "EXTERNAL_URL") {
    return item.url ?? "#";
  }
  if (item.targetKind === "BOARD") {
    return item.targetBoard ? `/board/${item.targetBoard.seq}` : "#";
  }
  return FIXED_HREF[item.targetKind] ?? "/";
}

// For BOARD targets, `label` is present but not authoritative — the board's
// own `name` is the single source of truth (see prisma/schema.prisma's
// NavItem.label comment), so a board rename can never drift out of sync
// with its own nav entry the way the old hardcoded "PHOTO"/"WORK" page
// titles did (see docs/roadmap.md).
export function resolveNavLabel(item: NavItemLike): string {
  return item.targetKind === "BOARD" && item.targetBoard ? item.targetBoard.name : item.label;
}
