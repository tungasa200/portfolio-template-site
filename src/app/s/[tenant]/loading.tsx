import { Skeleton } from "@/components/site/Skeleton";

// Mirrors page.tsx's hero layout so nothing shifts once the real image
// swaps in.
export default function TenantHomeLoading() {
  return (
    <section className="box-border flex h-full max-h-full items-center overflow-hidden px-16 py-10 md:px-[clamp(64px,6vw,140px)]">
      <div
        className="relative mx-auto flex w-full items-center justify-center border border-site-ink"
        style={{ maxWidth: "min(100%, calc(100vh - 160px))", aspectRatio: "1 / 1" }}
      >
        <Skeleton className="absolute inset-0" />
      </div>
    </section>
  );
}
