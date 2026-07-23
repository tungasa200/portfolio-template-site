interface FooterProps {
  ownerName: string;
  footerText?: string | null;
}

export function Footer({ ownerName, footerText }: FooterProps) {
  return (
    <footer className="flex justify-between border-t border-site-ink px-16 py-8 font-site-mono text-[11px] tracking-wide text-site-ink-muted">
      <span>{ownerName.toUpperCase()}</span>
      <span>{footerText ?? `© ${new Date().getFullYear()} ALL RIGHTS RESERVED`}</span>
    </footer>
  );
}
