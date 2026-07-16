import { Skeleton } from "@/components/site/Skeleton";

export default function BoardLoading() {
  return (
    <section className="box-border min-h-[calc(100vh-65px)] px-16 py-10">
      <div className="relative -mx-16 mb-14 flex shrink-0 items-center justify-between px-16 pb-5">
        <Skeleton className="h-6 w-28" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-site-border" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-site-border bg-site-paper">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="flex items-baseline justify-between border-t border-site-border px-[22px] py-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
