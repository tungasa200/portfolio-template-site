"use client";

import { useEffect, useRef, useState } from "react";

const MONTH_NAMES_KO = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function formatMonthKorean(value: string): string {
  if (!value) return "날짜 선택";
  const [y, m] = value.split("-");
  return `${y}년 ${Number(m)}월`;
}

interface MonthPickerProps {
  value: string;
  onChange: (value: string) => void;
}

// Replaces native input[type=month] — its calendar icon/popup is rendered by
// the OS/browser and can't be restyled to match design/admin-mockup.html.
export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (value ? Number(value.split("-")[0]) : new Date().getFullYear()));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function openPicker() {
    setViewYear(value ? Number(value.split("-")[0]) : new Date().getFullYear());
    setOpen((v) => !v);
  }

  return (
    <div className={`admin-month-picker ${value ? "has-value" : ""}`} ref={rootRef}>
      <button type="button" className="admin-month-picker-trigger" onClick={openPicker}>
        <svg className="admin-month-picker-icon" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3.2" width="12" height="10.8" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2 6.4h12M5.2 1.6v2.4M10.8 1.6v2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <span>{formatMonthKorean(value)}</span>
        <svg className="admin-month-picker-chevron" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="admin-month-picker-popover">
          <div className="admin-month-picker-header">
            <button type="button" className="admin-month-picker-nav-btn" onClick={() => setViewYear((y) => y - 1)}>
              ‹
            </button>
            <span>{viewYear}</span>
            <button type="button" className="admin-month-picker-nav-btn" onClick={() => setViewYear((y) => y + 1)}>
              ›
            </button>
          </div>
          <div className="admin-month-picker-grid">
            {MONTH_NAMES_KO.map((label, i) => {
              const cellValue = `${viewYear}-${String(i + 1).padStart(2, "0")}`;
              return (
                <button
                  key={cellValue}
                  type="button"
                  className={`admin-month-picker-cell ${value === cellValue ? "selected" : ""}`}
                  onClick={() => {
                    onChange(cellValue);
                    setOpen(false);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
