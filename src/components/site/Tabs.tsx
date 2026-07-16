export interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

// Controlled underline-tab row. Deliberately controlled (not useState-owning)
// so a page can drive it from local state today and from `searchParams` once
// Phase 3 wires real Project/Exhibition detail pages, without changing this
// component.
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div
      className="mb-10 flex shrink-0 gap-7 border-b border-site-border animate-site-intro-fade"
      style={{ animationDelay: "0.45s" }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className="cursor-pointer border-0 bg-transparent pb-2 font-site-mono text-[11px] tracking-wide"
            style={{
              color: isActive ? "var(--color-site-ink)" : "var(--color-site-ink-faint)",
              borderBottom: isActive ? "1px solid var(--color-site-ink)" : "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
