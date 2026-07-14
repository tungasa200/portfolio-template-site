// Root-domain marketing page (no tenant context). Real marketing site /
// self-serve signup is Phase 6 — this is a placeholder so the root domain
// doesn't 404 while tenant sites are under active development.
export default function MarketingHome() {
  return (
    <main
      style={{
        padding: 40,
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <h1>Photographer Portfolio Platform</h1>
      <p>Marketing site — coming in Phase 6.</p>
    </main>
  );
}
