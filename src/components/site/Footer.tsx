interface FooterProps {
  footerLeftText?: string | null;
  footerText?: string | null;
}

export function Footer({ footerLeftText, footerText }: FooterProps) {
  return (
    <footer className="flex justify-between border-t border-site-ink px-16 py-8 font-site-mono text-[11px] tracking-wide text-site-ink-muted">
      <span>{footerLeftText}</span>
      <span>{footerText ?? `© ${new Date().getFullYear()} ALL RIGHTS RESERVED`}</span>
    </footer>
  );
}
