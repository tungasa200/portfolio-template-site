interface FooterProps {
  footerLeftText?: string | null;
  footerText?: string | null;
}

export function Footer({ footerLeftText, footerText }: FooterProps) {
  return (
    <footer className="flex flex-col items-start gap-2 border-t border-site-ink px-[var(--site-gutter)] py-6 font-site-mono text-[11px] tracking-wide text-site-ink-muted sm:flex-row sm:items-center sm:justify-between sm:gap-0 lg:py-8">
      {footerLeftText && <span>{footerLeftText}</span>}
      <span>{footerText ?? `© ${new Date().getFullYear()} ALL RIGHTS RESERVED`}</span>
    </footer>
  );
}
