"use client";

import { useEffect, useState } from "react";
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

// Collapsible sidebar chrome — ported from design/Photographer Portfolio.dc.html.
// Owns nav open/close, link hover/active underline, and the scroll-to-top
// button (folded in here rather than a separate file since it's small,
// stateful chrome coupled to the same scroll listener).
export function Nav({ siteName, logoUrl, navItems, socialLinks }: NavProps) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(true);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <nav
        style={{
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          width: navOpen ? "220px" : "0px",
          minWidth: navOpen ? "220px" : "0px",
          height: "100vh",
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

      <button
        aria-label={navOpen ? "Collapse navigation" : "Expand navigation"}
        onClick={() => setNavOpen((open) => !open)}
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
          display: "flex",
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

      <button
        aria-label="Scroll to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{
          position: "fixed",
          bottom: "112px",
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
