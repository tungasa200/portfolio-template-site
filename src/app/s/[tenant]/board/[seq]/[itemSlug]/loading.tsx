import { Skeleton } from "@/components/site/Skeleton";

export default function BoardItemDetailLoading() {
  return (
    <section className="box-border flex h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] flex-col overflow-hidden px-16 py-10">
      <div className="relative -mx-16 mb-8 flex shrink-0 items-center justify-between px-16 pb-5">
        <Skeleton className="h-6 w-36" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-site-border" />
      </div>
      <div className="mb-6 flex shrink-0 gap-6">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="flex-1 w-full" />
    </section>
  );
}
