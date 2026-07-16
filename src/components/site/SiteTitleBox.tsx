"use client";

import { useLayoutEffect, useRef, useState } from "react";

// The site title's line box is pinned to this height everywhere it's
// rendered (public Nav, admin settings preview) so it's pixel-identical
// whether it's showing siteName text or an uploaded logo image — both must
// land on the same baseline as whatever divider/UI sits under it,
// regardless of content length/aspect ratio.
export const TITLE_LINE_HEIGHT = "1.5rem"; // matches text-2xl's font-size at line-height:1

// Shrinks siteName text (via a uniform CSS scale, not font-size) just enough
// to fit the fixed-height title box's width — never truncates, never wraps.
// scale() only affects paint, not layout, so the box's own height never
// moves even when this returns < 1. Measured with scrollWidth/clientWidth
// (layout-time, unaffected by any transform already applied).
function useFitTextScale(text: string, containerRef: React.RefObject<HTMLDivElement | null>, textRef: React.RefObject<HTMLSpanElement | null>) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const recompute = () => {
      const container = containerRef.current;
      const el = textRef.current;
      if (!container || !el) return;
      const containerWidth = container.clientWidth;
      const textWidth = el.scrollWidth;
      setScale(textWidth > containerWidth && containerWidth > 0 ? containerWidth / textWidth : 1);
    };

    recompute();

    // Web fonts (Playfair Display via next/font) can swap after first paint
    // and change the measured text width — re-measure once they're ready.
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(recompute).catch(() => {});
    }

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return scale;
}

interface SiteTitleBoxProps {
  siteName: string;
  logoUrl?: string | null;
  textClassName?: string;
  // Overrides (color, fontFamily, ...) — the admin preview isn't inside the
  // public site's theme.css tree (no --font-site-display/site-ink tokens
  // there), so it passes its own font-family/color here instead of relying
  // on textClassName alone.
  textStyle?: React.CSSProperties;
}

// Shared between the public Nav and the admin Settings logo preview so the
// two can never visually drift apart — same fixed-height box, same fit-text
// behavior, same object-fit logo handling, in both places.
export function SiteTitleBox({ siteName, logoUrl, textClassName, textStyle }: SiteTitleBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const scale = useFitTextScale(siteName, boxRef, textRef);

  return (
    <div
      ref={boxRef}
      style={{
        height: TITLE_LINE_HEIGHT,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        maxWidth: "100%",
      }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={siteName}
          style={{ height: "100%", width: "auto", maxWidth: "100%", objectFit: "contain" }}
        />
      ) : (
        <span
          ref={textRef}
          className={textClassName}
          style={{
            ...textStyle,
            lineHeight: 1,
            whiteSpace: "nowrap",
            display: "inline-block",
            transform: `scale(${scale})`,
            transformOrigin: "left center",
          }}
        >
          {siteName}
        </span>
      )}
    </div>
  );
}
