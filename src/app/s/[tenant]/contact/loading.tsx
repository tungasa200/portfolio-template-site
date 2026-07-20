import { Skeleton } from "@/components/site/Skeleton";

export default function ContactLoading() {
  return (
    <section className="box-border flex h-full max-h-full flex-col overflow-hidden px-16 py-10">
      <div className="relative -mx-16 mb-12 flex shrink-0 items-center justify-between px-16 pb-5">
        <Skeleton className="h-6 w-40" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-site-border" />
      </div>

      <div className="relative grid flex-1 grid-cols-[6fr_4fr] gap-0">
        <div className="absolute top-0 left-[60%] h-full w-px bg-site-border" />

        <div className="flex flex-col gap-4 pr-10">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>

        <div className="flex flex-col gap-6 pt-1 pl-10">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </section>
  );
}
