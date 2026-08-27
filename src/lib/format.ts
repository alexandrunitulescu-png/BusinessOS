/** Locale-aware formatting helpers. UI is Romanian, so default locale is ro-RO. */

const LOCALE = "ro-RO";

/** Money as e.g. "1.234,50 RON". Falls back gracefully for unknown currencies. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${formatNumber(amount)} ${currency}`;
  }
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Date as e.g. "27 aug. 2026". Accepts a Date or an ISO / yyyy-mm-dd string. */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
