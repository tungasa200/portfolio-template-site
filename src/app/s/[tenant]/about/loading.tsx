import { Skeleton } from "@/components/site/Skeleton";

export default function AboutLoading() {
  return (
    <section className="box-border min-h-[calc(100vh-65px)] px-16 py-10">
      <div className="relative -mx-16 mb-14 flex shrink-0 items-center justify-between px-16 pb-5">
        <Skeleton className="h-6 w-32" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-site-border" />
      </div>
      <div className="flex max-w-[640px] flex-col gap-3">
        <Skeleton className="h-[17px] w-full" />
        <Skeleton className="h-[17px] w-full" />
        <Skeleton className="h-[17px] w-5/6" />
        <Skeleton className="h-[17px] w-full" />
        <Skeleton className="h-[17px] w-2/3" />
      </div>
    </section>
  );
}
