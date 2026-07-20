"use client";

import { Suspense, useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, type TabItem } from "./Tabs";
import { PhotoGridDetail } from "./PhotoGridDetail";
import { FullscreenViewer, type FullscreenPhoto } from "./FullscreenViewer";
import { IndexTab } from "./IndexTab";
import { ImageLightbox } from "./ImageLightbox";
import type { IndexImageRatio } from "@/lib/site/index-image-ratio";

interface DetailTabsProps {
  tabs: TabItem[];
  /** Tab shown before the URL's ?view= is read (and whenever it's absent/invalid). */
  defaultView: string;
  gridPhotos: FullscreenPhoto[];
  /** Per-item INDEX content (BoardItem.indexContent) — pass null/undefined
   * when the item has indexEnabled=false; the page building `tabs` already
   * omits the "index" tab in that case, this just backs its content. */
  indexContent?: string | null;
  /** Item's primary photo url, if any — backs the INDEX tab's cover column. */
  indexCoverPhotoUrl?: string | null;
  indexCoverPhotoWidth?: number | null;
  indexCoverPhotoHeight?: number | null;
  indexImageRatio?: IndexImageRatio;
}

// Shared URL-synced controller for every GALLERY_MULTI board's item detail
// page. Sync active tab / active fullscreen photo to ?view=&photo= so a
// fullscreen photo is a shareable/deep-linkable URL, per docs/roadmap.md
// Phase 3.
//
// useSearchParams() is isolated to the inner component below and wrapped in
// Suspense so the server page above never reads searchParams itself — that
// requirement is what forces a whole route to server-render on every
// request (see Next's useSearchParams docs). Keeping it client-side and
// Suspense-boundary-scoped is what lets board/[seq]/[itemSlug] stay
// static/ISR-cacheable like the rest of the tenant site. The fallback
// renders the item's default tab, which is also the final state for every
// visit except a deep link with ?view=/&photo= already in the URL.
export function DetailTabs(props: DetailTabsProps) {
  return (
    <Suspense fallback={<DetailTabsView {...props} activeView={props.defaultView} activePhotoIndex={0} />}>
      <DetailTabsUrlSynced {...props} />
    </Suspense>
  );
}

function DetailTabsUrlSynced({
  tabs,
  defaultView,
  gridPhotos,
  indexContent,
  indexCoverPhotoUrl,
  indexCoverPhotoWidth,
  indexCoverPhotoHeight,
  indexImageRatio,
}: DetailTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const validViews = new Set(tabs.map((t) => t.key));
  const viewParam = searchParams.get("view");
  const activeView = viewParam && validViews.has(viewParam) ? viewParam : defaultView;

  const photoParam = Number(searchParams.get("photo"));
  const activePhotoIndex = Math.min(
    Math.max(Number.isFinite(photoParam) ? photoParam : 0, 0),
    Math.max(gridPhotos.length - 1, 0)
  );

  const pushParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setView = (key: string) => {
    pushParams({ view: key, photo: key === "fullscreen" ? String(activePhotoIndex) : null });
  };

  const setPhotoIndex = (index: number) => {
    pushParams({ view: "fullscreen", photo: String(index) });
  };

  return (
    <DetailTabsView
      tabs={tabs}
      activeView={activeView}
      gridPhotos={gridPhotos}
      activePhotoIndex={activePhotoIndex}
      indexContent={indexContent}
      indexCoverPhotoUrl={indexCoverPhotoUrl}
      indexCoverPhotoWidth={indexCoverPhotoWidth}
      indexCoverPhotoHeight={indexCoverPhotoHeight}
      indexImageRatio={indexImageRatio}
      onSetView={setView}
      onSetPhotoIndex={setPhotoIndex}
    />
  );
}

interface DetailTabsViewProps {
  tabs: TabItem[];
  activeView: string;
  gridPhotos: FullscreenPhoto[];
  activePhotoIndex: number;
  indexContent?: string | null;
  indexCoverPhotoUrl?: string | null;
  indexCoverPhotoWidth?: number | null;
  indexCoverPhotoHeight?: number | null;
  indexImageRatio?: IndexImageRatio;
  onSetView?: (key: string) => void;
  onSetPhotoIndex?: (index: number) => void;
}

function DetailTabsView({
  tabs,
  activeView,
  gridPhotos,
  activePhotoIndex,
  indexContent,
  indexCoverPhotoUrl,
  indexCoverPhotoWidth,
  indexCoverPhotoHeight,
  indexImageRatio,
  onSetView,
  onSetPhotoIndex,
}: DetailTabsViewProps) {
  // Original-image lightbox is shared by GRID VIEW and SLIDE VIEW — both
  // browse the same `gridPhotos` array, just with different tile layouts.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs tabs={tabs} active={activeView} onChange={onSetView ?? (() => {})} />
      {/* min-h-0 + overflow-y-auto: INDEX/GRID VIEW content can be taller
          than the fixed-viewport section above and gets a scroll fallback
          here instead of growing the page. SLIDE VIEW (FullscreenViewer)
          sizes itself to h-full and never needs to trigger that scroll —
          see its own component comment. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeView === "index" && indexContent && (
          <IndexTab
            contentHtml={indexContent}
            coverPhotoUrl={indexCoverPhotoUrl}
            coverPhotoWidth={indexCoverPhotoWidth}
            coverPhotoHeight={indexCoverPhotoHeight}
            imageRatio={indexImageRatio}
          />
        )}
        {activeView === "grid" && <PhotoGridDetail photos={gridPhotos} onPhotoClick={setLightboxIndex} />}
        {activeView === "fullscreen" && (
          <FullscreenViewer
            photos={gridPhotos}
            activeIndex={activePhotoIndex}
            onSelect={onSetPhotoIndex ?? (() => {})}
            onExpand={setLightboxIndex}
          />
        )}
      </div>
      <ImageLightbox
        open={lightboxIndex !== null}
        index={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        slides={gridPhotos.map((photo) => ({
          src: photo.imageUrl ?? "",
          width: photo.width,
          height: photo.height,
          alt: photo.label,
          title: photo.label,
          description: photo.width && photo.height ? `${photo.width} × ${photo.height}` : undefined,
        }))}
      />
    </div>
  );
}
