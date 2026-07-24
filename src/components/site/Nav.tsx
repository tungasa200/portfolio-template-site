"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteTitleBox } from "@/components/site/SiteTitleBox";

export interface NavLinkItem {
  id: string;
  label: string;
  href: string;
  external: boolean;
}

export interface NavSocialLink {
  id: string;
  platform: string;
  url: string;
}

interface NavProps {
  siteName: string;
  logoUrl?: string | null;
  navItems: NavLinkItem[];
  socialLinks: NavSocialLink[];
}

// Chrome for the public site: a collapsible left sidebar at lg+ (ported from
// design/Photographer Portfolio.dc.html), and a top bar + full-screen
// overlay drawer below lg — the 220px sidebar has no room to live in at
// phone/tablet widths, so it's swapped for a different presentation of the
// same nav data rather than being squeezed. Both markups render on every
// request and are shown/hidden purely via `hidden lg:*` classes (no
// matchMedia) so there's no hydration-time flash.
export function Nav({ siteName, logoUrl, navItems, socialLinks }: NavProps) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Body scroll lock + focus management + Esc-to-close + a Tab focus trap
  // scoped to the drawer while it's open.
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        menuTriggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  // Route changes (tapping a Link inside the drawer) should close it too —
  // belt-and-suspenders alongside each link's own onClick below.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const underlineStyle = (href: string): React.CSSProperties => ({
    color: "var(--color-site-ink)",
    textDecoration: "none",
    paddingBottom: "4px",
    width: "fit-content",
    lineHeight: 1,
    backgroundImage:
      "linear-gradient(var(--color-site-ink), var(--color-site-ink))",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "left bottom",
    backgroundSize: isActive(href) || hoveredHref === href ? "100% 1px" : "0% 1px",
    transition: "background-size 0.3s ease",
  });

  return (
    <>
      {/* Desktop sidebar (lg+) — unchanged from the original design. */}
      <nav
        className="hidden lg:block"
        style={{
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          width: navOpen ? "220px" : "0px",
          minWidth: navOpen ? "220px" : "0px",
          height: "100dvh",
          borderRight: "1px solid var(--color-site-ink)",
          overflow: "hidden",
          transition: "width 0.35s ease, min-width 0.35s ease",
        }}
      >
        <div className="flex h-full w-[220px] min-w-[220px] flex-col py-10 px-7">
          <div className="relative -mx-7 px-7 pb-5">
            <div
              style={{
                opacity: navOpen ? 1 : 0,
                transition: navOpen ? "opacity 0.25s ease 0.3s" : "opacity 0.1s ease",
              }}
            >
              <Link href="/" aria-label="Home" style={{ display: "block", textDecoration: "none" }}>
                <SiteTitleBox siteName={siteName} logoUrl={logoUrl} textClassName="font-site-display text-2xl tracking-wide" />
              </Link>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-site-ink" />
          </div>

          <div
            className="mt-14 flex flex-col gap-[18px] text-sm tracking-wide"
            style={{
              opacity: navOpen ? 1 : 0,
              transition: navOpen ? "opacity 0.25s ease 0.3s" : "opacity 0.1s ease",
            }}
          >
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onMouseEnter={() => setHoveredHref(item.href)}
                  onMouseLeave={() => setHoveredHref(null)}
                  className="site-nav-link"
                  style={underlineStyle(item.href)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  onMouseEnter={() => setHoveredHref(item.href)}
                  onMouseLeave={() => setHoveredHref(null)}
                  className="site-nav-link"
                  style={underlineStyle(item.href)}
                >
                  {item.label}
                </Link>
              )
            )}
          </div>

          <div
            className="mt-auto flex flex-col gap-2.5 text-xs tracking-wide"
            style={{
              opacity: navOpen ? 1 : 0,
              transition: navOpen ? "opacity 0.25s ease 0.3s" : "opacity 0.1s ease",
            }}
          >
            {socialLinks.map((social) => (
              <a
                key={social.id}
                href={social.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-site-ink-muted no-underline hover:text-site-ink"
              >
                {social.platform.toUpperCase()} <span className="text-[11px]">↗</span>
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Desktop sidebar collapse toggle (lg+ only — the mobile menu trigger
          in the top bar below covers the same job at narrower widths). */}
      <button
        aria-label={navOpen ? "Collapse navigation" : "Expand navigation"}
        onClick={() => setNavOpen((open) => !open)}
        className="hidden lg:flex"
        style={{
          position: "fixed",
          top: "50vh",
          left: navOpen ? "207px" : "-13px",
          transform: "translateY(-50%)",
          width: "26px",
          height: "26px",
          border: "1px solid var(--color-site-ink)",
          background: "var(--color-site-paper)",
          cursor: "pointer",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          borderRadius: "50%",
          zIndex: 3,
          transition: "left 0.35s ease",
        }}
      >
        <div
          style={{
            width: "7px",
            height: "7px",
            borderRight: "1px solid var(--color-site-ink)",
            borderBottom: "1px solid var(--color-site-ink)",
            transform: navOpen ? "rotate(135deg)" : "rotate(-45deg)",
            transition: "transform 0.25s ease",
          }}
        />
      </button>

      {/* Mobile/tablet top bar (below lg). */}
      <header
        className="flex items-center justify-between border-b border-site-ink px-[var(--site-gutter)] py-2.5 lg:hidden"
        style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--color-site-paper)" }}
      >
        <Link href="/" aria-label="Home" style={{ display: "block", flex: 1, minWidth: 0, textDecoration: "none" }}>
          <SiteTitleBox siteName={siteName} logoUrl={logoUrl} textClassName="font-site-display text-lg tracking-wide" />
        </Link>
        <button
          ref={menuTriggerRef}
          type="button"
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={mobileOpen}
          aria-controls="site-mobile-drawer"
          onClick={() => setMobileOpen((open) => !open)}
          className="ml-4 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
        >
          <span aria-hidden style={{ position: "relative", display: "block", width: "14px", height: "10px" }}>
            <span
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                width: "14px",
                height: "1px",
                background: "var(--color-site-ink)",
                transform: mobileOpen ? "translateY(-50%) rotate(45deg)" : "translateY(calc(-50% - 4.5px))",
                transition: "transform 0.25s ease",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                width: "14px",
                height: "1px",
                background: "var(--color-site-ink)",
                transform: mobileOpen ? "translateY(-50%) rotate(-45deg)" : "translateY(calc(-50% + 4.5px))",
                transition: "transform 0.25s ease",
              }}
            />
          </span>
        </button>
      </header>

      {/* Mobile/tablet overlay drawer — same info order as the desktop
          sidebar (logo → menu → social) so it reads as the same site, not a
          stripped-down alternate. Opaque site-paper background on purpose —
          no blur/translucency, which would read as generic app chrome
          against this sharp/flat editorial look. */}
      <div
        id="site-mobile-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={siteName}
        className="fixed inset-0 z-30 flex flex-col bg-site-paper lg:hidden"
        style={{
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      >
        {/* Same box model as the top bar (px-[var(--site-gutter)] py-2.5 +
            border-b + 44px button) so the logo and trigger sit in exactly
            the same spot the header left them in — opening the drawer reads
            as that row growing a panel underneath it, not a jump-cut to a
            differently-positioned header. */}
        <div className="flex shrink-0 items-center justify-between border-b border-site-ink px-[var(--site-gutter)] py-2.5">
          <SiteTitleBox siteName={siteName} logoUrl={logoUrl} textClassName="font-site-display text-lg tracking-wide" />
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => {
              setMobileOpen(false);
              menuTriggerRef.current?.focus();
            }}
            className="ml-4 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
          >
            <span aria-hidden style={{ position: "relative", display: "block", width: "14px", height: "14px" }}>
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  width: "14px",
                  height: "1px",
                  background: "var(--color-site-ink)",
                  transform: "translateY(-50%) rotate(45deg)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  width: "14px",
                  height: "1px",
                  background: "var(--color-site-ink)",
                  transform: "translateY(-50%) rotate(-45deg)",
                }}
              />
            </span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[var(--site-gutter)] py-8">
          <nav aria-label={siteName} className="flex flex-col gap-6 font-site-display text-base tracking-wide">
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="site-nav-link"
                  style={underlineStyle(item.href)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="site-nav-link"
                  style={underlineStyle(item.href)}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="mt-auto flex flex-col gap-4 pt-10 font-site-mono text-xs tracking-wide">
            {socialLinks.map((social) => (
              <a
                key={social.id}
                href={social.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-site-ink-muted no-underline hover:text-site-ink"
              >
                {social.platform.toUpperCase()} <span className="text-[11px]">↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <button
        aria-label="Scroll to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{
          position: "fixed",
          bottom: "calc(112px + env(safe-area-inset-bottom, 0px))",
          right: "32px",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          border: "1px solid var(--color-site-ink)",
          background: "var(--color-site-paper)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          zIndex: 5,
          opacity: scrolled ? 1 : 0,
          pointerEvents: scrolled ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderTop: "1px solid var(--color-site-ink)",
            borderLeft: "1px solid var(--color-site-ink)",
            transform: "rotate(45deg)",
            marginTop: "3px",
          }}
        />
      </button>
    </>
  );
}
