interface SectionHeaderProps {
  title: string;
  delay?: string;
  /** Tailwind margin-bottom class — the mockup varies this per page
   * (list pages: mb-14/56px, detail pages: mb-8/32px, contact: mb-12/48px). */
  marginBottom?: string;
}

// Animated-underline heading used at the top of every content section.
export function SectionHeader({ title, delay = "0.35s", marginBottom = "mb-14" }: SectionHeaderProps) {
  return (
    <div className={`relative -mx-16 ${marginBottom} flex items-center justify-between px-16 pb-5`}>
      <h2
        className="m-0 overflow-hidden text-ellipsis whitespace-nowrap font-site-display text-2xl leading-none font-medium animate-site-intro-fade"
        style={{ animationDelay: delay }}
      >
        {title}
      </h2>
      <div className="absolute inset-x-0 bottom-0 h-px origin-left bg-site-ink animate-site-intro-line" />
    </div>
  );
}
