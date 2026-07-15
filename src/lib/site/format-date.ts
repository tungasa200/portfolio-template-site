const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** BoardItem.dateValue is a "YYYY-MM" string (never a typed range — see
 * docs/progress.md's unified item-model decision). Formats it to match the
 * design mockup's period style, e.g. "Sep 2025". */
export function formatBoardDate(value: string | null): string {
  if (!value) return "";
  const [y, m] = value.split("-");
  const monthIndex = Number(m) - 1;
  if (!y || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return "";
  return `${MONTH_NAMES[monthIndex]} ${y}`;
}
