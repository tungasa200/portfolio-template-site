"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { updateSiteTheme } from "@/lib/actions/site-settings";
import type { ActionFormState } from "@/lib/actions/site-settings";
import { THEME_PRESETS, type PresetThemeName, type ThemeName } from "@/lib/site/theme-presets";
import { useToast } from "@/components/admin/Toast";

const initialState: ActionFormState = { status: "idle" };

interface ThemeSettingsProps {
  themeName: string;
  themeCustomInk: string | null;
  themeCustomPaper: string | null;
}

function isPresetThemeName(value: string): value is PresetThemeName {
  return value in THEME_PRESETS;
}

// Relative-luminance contrast check (WCAG formula, simplified for sRGB hex
// input) — a soft, non-blocking nudge so an admin doesn't accidentally pick
// two near-identical custom colors and end up with unreadable text.
function contrastRatio(hexA: string, hexB: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);
    const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const [l1, l2] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function ThemeSettings({ themeName, themeCustomInk, themeCustomPaper }: ThemeSettingsProps) {
  const [state, formAction, isPending] = useActionState(updateSiteTheme, initialState);
  const [selected, setSelected] = useState<ThemeName>(isPresetThemeName(themeName) || themeName === "custom" ? (themeName as ThemeName) : "editorial-default");
  const fallback = isPresetThemeName(themeName) ? THEME_PRESETS[themeName] : THEME_PRESETS["editorial-default"];
  const [customInk, setCustomInk] = useState(themeCustomInk ?? (fallback.ink.startsWith("#") ? fallback.ink : "#3B2E24"));
  const [customPaper, setCustomPaper] = useState(themeCustomPaper ?? (fallback.paper.startsWith("#") ? fallback.paper : "#F1E7D8"));
  const toast = useToast();

  useEffect(() => {
    if (state.status !== "idle" && state.message) toast(state.message, state.status === "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const lowContrast = useMemo(() => contrastRatio(customInk, customPaper) < 2, [customInk, customPaper]);

  return (
    <div className="admin-section-card">
      <h2>홈페이지 테마</h2>
      <p className="admin-section-desc">방문자에게 보이는 홈페이지의 배경/글씨 색상을 바꿔보세요.</p>

      <form action={formAction}>
        <div className="admin-theme-grid">
          {(Object.keys(THEME_PRESETS) as PresetThemeName[]).map((name) => (
            <label key={name} className={`admin-theme-card ${selected === name ? "is-selected" : ""}`}>
              <input
                type="radio"
                name="themeName"
                value={name}
                checked={selected === name}
                onChange={() => setSelected(name)}
                className="admin-theme-card-radio"
              />
              <span className="admin-theme-swatch-pair">
                <span className="admin-theme-swatch" style={{ background: THEME_PRESETS[name].paper }} />
                <span className="admin-theme-swatch" style={{ background: THEME_PRESETS[name].ink }} />
              </span>
              <span>{THEME_PRESETS[name].label}</span>
            </label>
          ))}

          <label className={`admin-theme-card ${selected === "custom" ? "is-selected" : ""}`}>
            <input
              type="radio"
              name="themeName"
              value="custom"
              checked={selected === "custom"}
              onChange={() => setSelected("custom")}
              className="admin-theme-card-radio"
            />
            <span className="admin-theme-swatch-pair">
              <span className="admin-theme-swatch" style={{ background: customPaper }} />
              <span className="admin-theme-swatch" style={{ background: customInk }} />
            </span>
            <span>커스텀</span>
          </label>
        </div>

        {selected === "custom" && (
          <div className="admin-field-row" style={{ marginTop: 18 }}>
            <div className="admin-field">
              <label>배경색</label>
              <input
                type="color"
                name="themeCustomPaper"
                value={customPaper}
                onChange={(e) => setCustomPaper(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label>글씨색</label>
              <input
                type="color"
                name="themeCustomInk"
                value={customInk}
                onChange={(e) => setCustomInk(e.target.value)}
              />
            </div>
          </div>
        )}
        {selected === "custom" && lowContrast && (
          <p className="admin-section-desc" style={{ color: "var(--danger)", marginTop: 10 }}>
            두 색상이 너무 비슷해서 글씨가 잘 안 보일 수 있어요.
          </p>
        )}

        <div className="admin-card-footer">
          <button type="submit" className="admin-btn admin-btn-primary" disabled={isPending}>
            {isPending ? "저장 중…" : "저장하기"}
          </button>
        </div>
      </form>
    </div>
  );
}
