// Single source of truth for the public site's theme options — consumed by
// src/app/s/[tenant]/layout.tsx (runtime CSS var override), the
// updateSiteTheme server action (validation), and ThemeSettings.tsx (swatch
// rendering). Every theme is exactly 2 colors: `ink` (text) and `paper`
// (background) — theme.css derives everything else from these two via
// color-mix(), so that's all any theme, preset or custom, needs to supply.

export type PresetThemeName = "editorial-default" | "inverted" | "warm-beige" | "sage";
export type ThemeName = PresetThemeName | "custom";

export const THEME_NAMES: ThemeName[] = ["editorial-default", "inverted", "warm-beige", "sage", "custom"];

export const THEME_PRESETS: Record<PresetThemeName, { ink: string; paper: string; label: string }> = {
  "editorial-default": { ink: "oklch(0.18 0 0)", paper: "oklch(0.99 0.002 90)", label: "기본" },
  inverted: { ink: "oklch(0.99 0.002 90)", paper: "oklch(0.18 0 0)", label: "역전" },
  "warm-beige": { ink: "#3B2E24", paper: "#F1E7D8", label: "웜베이지" },
  sage: { ink: "#1F2E22", paper: "#E7EDE4", label: "세이지" },
};

function isPresetThemeName(value: string): value is PresetThemeName {
  return value in THEME_PRESETS;
}

export function resolveThemeColors(
  settings:
    | { themeName: string; themeCustomInk: string | null; themeCustomPaper: string | null }
    | null
    | undefined
): { ink: string; paper: string } {
  const name = settings?.themeName ?? "editorial-default";
  if (name === "custom" && settings?.themeCustomInk && settings?.themeCustomPaper) {
    return { ink: settings.themeCustomInk, paper: settings.themeCustomPaper };
  }
  return isPresetThemeName(name) ? THEME_PRESETS[name] : THEME_PRESETS["editorial-default"];
}
