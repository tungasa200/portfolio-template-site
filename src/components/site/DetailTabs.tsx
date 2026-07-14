"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, type TabItem } from "./Tabs";
import { PhotoGridDetail } from "./PhotoGridDetail";
import { FullscreenViewer, type FullscreenPhoto } from "./FullscreenViewer";

interface DetailTabsProps {
  tabs: TabItem[];
  activeView: string;
  gridPhotos: FullscreenPhoto[];
  activePhotoIndex: number;
  /** Work-only INDEX tab content (description + cover photo) — Photo detail
   * pages don't pass this. */
  indexSlot?: ReactNode;
}

// Shared URL-synced controller for Project/Exhibition detail pages. Both
// need identical logic (sync active tab / active fullscreen photo to
// ?view=&photo= so a fullscreen photo is a shareable/deep-linkable URL, per
// docs/roadmap.md Phase 3), so it's written once here rather than duplicated
// per page. Tabs/PhotoGridDetail/FullscreenViewer stay pure/controlled.
export function DetailTabs({ tabs, activeView, gridPhotos, activePhotoIndex, indexSlot }: DetailTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pushParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setView = (key: string) => {
    pushParams({ view: key, photo: key === "fullscreen" ? String(activePhotoIndex) : null });
  };

  const setPhotoIndex = (index: number) => {
    pushParams({ view: "fullscreen", photo: String(index) });
  };

  return (
    <>
      <Tabs tabs={tabs} active={activeView} onChange={setView} />
      {activeView === "index" && indexSlot}
      {activeView === "grid" && <PhotoGridDetail photos={gridPhotos} />}
      {activeView === "fullscreen" && (
        <FullscreenViewer photos={gridPhotos} activeIndex={activePhotoIndex} onSelect={setPhotoIndex} />
      )}
    </>
  );
}
