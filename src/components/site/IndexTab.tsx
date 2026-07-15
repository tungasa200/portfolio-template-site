interface IndexTabProps {
  /** Trusted admin-authored rich HTML (same trust model as AboutPage.content
   * — not user-submitted, safe to render directly). */
  contentHtml: string;
}

// INDEX tab content — per-item now, not per-board (see docs/roadmap.md's
// board redesign notes). Cover photo is a placeholder box until Phase 4's
// real upload/image pipeline lands, same as every other photo slot today.
export function IndexTab({ contentHtml }: IndexTabProps) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr] gap-16 animate-site-intro-fade" style={{ animationDelay: "0.55s" }}>
      <div
        className="max-w-[520px] text-[17px] leading-[1.75] text-site-ink-body"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      <div className="relative flex aspect-[4/3] items-end overflow-hidden border border-site-ink bg-site-paper site-placeholder-pattern">
        <div className="relative px-[18px] py-4">
          <span className="border border-site-ink bg-site-paper px-2 py-1 font-site-mono text-[11px] tracking-wide text-site-ink-soft">
            COVER PHOTO
          </span>
        </div>
      </div>
    </div>
  );
}
