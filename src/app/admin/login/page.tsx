import { LoginForm } from "@/components/admin/LoginForm";

// Reached via proxy.ts rewriting admin.{ROOT_DOMAIN}/login to /admin/login.
// Deliberately plain — the tenant design system (theme.css) is public-site
// only, admin gets ordinary Tailwind defaults.
export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-6">
      <h1 className="text-xl font-semibold text-neutral-900">Admin sign in</h1>
      <LoginForm />
    </main>
  );
}
