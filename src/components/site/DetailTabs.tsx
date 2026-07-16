"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, type TabItem } from "./Tabs";
import { PhotoGridDetail } from "./PhotoGridDetail";
import { FullscreenViewer, type FullscreenPhoto } from "./FullscreenViewer";
import { IndexTab } from "./IndexTab";

interface DetailTabsProps {
  tabs: TabItem[];
  activeView: string;
  gridPhotos: FullscreenPhoto[];
  activePhotoIndex: number;
  /** Per-item INDEX content (BoardItem.indexContent) — pass null/undefined
   * when the item has indexEnabled=false; the page building `tabs` already
   * omits the "index" tab in that case, this just backs its content. */
  indexContent?: string | null;
}

// Shared URL-synced controller for every GALLERY_MULTI board's item detail
// page. Sync active tab / active fullscreen photo to ?view=&photo= so a
// fullscreen photo is a shareable/deep-linkable URL, per docs/roadmap.md
// Phase 3. Tabs/PhotoGridDetail/FullscreenViewer stay pure/controlled.
export function DetailTabs({ tabs, activeView, gridPhotos, activePhotoIndex, indexContent }: DetailTabsProps) {
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
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs tabs={tabs} active={activeView} onChange={setView} />
      {/* min-h-0 + overflow-y-auto: INDEX/GRID VIEW content can be taller
          than the fixed-viewport section above and gets a scroll fallback
          here instead of growing the page. SLIDE VIEW (FullscreenViewer)
          sizes itself to h-full and never needs to trigger that scroll —
          see its own component comment. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeView === "index" && indexContent && <IndexTab contentHtml={indexContent} />}
        {activeView === "grid" && <PhotoGridDetail photos={gridPhotos} />}
        {activeView === "fullscreen" && (
          <FullscreenViewer photos={gridPhotos} activeIndex={activePhotoIndex} onSelect={setPhotoIndex} />
        )}
      </div>
    </div>
  );
}
