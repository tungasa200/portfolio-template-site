// Icon path data ported verbatim from design/admin-mockup.html so the
// sidebar keeps pixel-identical iconography between mockup and real code.
export const ADMIN_ICON_PATHS = {
  home: "M2 8.5 8 3l6 5.5M3.5 7.5V13a.5.5 0 0 0 .5.5h3v-4h2v4h3a.5.5 0 0 0 .5-.5V7.5",
  about: "M3.2 1.8h7.2l2.4 2.4v9.4a.6.6 0 0 1-.6.6H3.2a.6.6 0 0 1-.6-.6V2.4a.6.6 0 0 1 .6-.6ZM4.8 7.4h6.4M4.8 9.8h6.4M4.8 5h3.2",
  messages: "M1.8 3.4h12.4v9.2H1.8zM2.4 4.2 8 8.4l5.6-4.2",
  settings: "M8 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z",
  boardMulti: "M1.8 3.2h10.4v8.6H1.8zM4.2 8.4h10.4v3.4a1 1 0 0 1-1 1H5.2a1 1 0 0 1-1-1z",
  boardSingle: "M2 2.6h12v10.8H2zM5.4 6a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2ZM2 10.6l3.4-3.8 2.6 2.8 2-2.2L14 10.6",
  logout: "M6.4 2.4H3.6a1 1 0 0 0-1 1v9.2a1 1 0 0 0 1 1h2.8M10.4 11.2l3.2-3.2-3.2-3.2M13.4 8H6",
} as const;

export function AdminNavIcon({ path }: { path: string }) {
  return (
    <svg className="admin-nav-icon" viewBox="0 0 16 16" fill="none">
      <path d={path} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
