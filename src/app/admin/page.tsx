// Reached via proxy.ts rewriting admin.{ROOT_DOMAIN}/* to /admin/*.
// Auth.js session gate + real dashboard land in Phase 4 (admin CRUD).
export default function AdminPlaceholderPage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Admin</h1>
      <p>Routing OK — auth and dashboard land in Phase 4.</p>
    </main>
  );
}
