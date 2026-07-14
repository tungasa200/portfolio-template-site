const INTERNAL_PAGE_HREF: Record<string, string> = {
  HOME: "/",
  PHOTO: "/photo",
  WORK: "/work",
  CONTACT: "/contact",
};

interface NavItemLike {
  type: string;
  targetPage: string | null;
  url: string | null;
}

export function resolveNavHref(item: NavItemLike): string {
  if (item.type === "EXTERNAL_URL") {
    return item.url ?? "#";
  }
  return INTERNAL_PAGE_HREF[item.targetPage ?? "HOME"] ?? "/";
}
