const DAYS = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatDate(value, fallback = "Not set") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : dateFormatter.format(date);
}

export function formatDateTime(value, fallback = "Not set") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : dateTimeFormatter.format(date);
}

export function formatTime(value, fallback = "Not set") {
  if (!value) return fallback;
  const match = String(value).match(/^(\d{2}):(\d{2})$/);
  if (!match) return fallback;
  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
  return timeFormatter.format(date);
}

export function formatDay(value) {
  return DAYS[Number(value)] ?? "Not set";
}

export function formatPaise(value, fallback = "Not set") {
  if (value == null || Number.isNaN(Number(value))) return fallback;
  return moneyFormatter.format(Number(value) / 100);
}

export function formatPercent(value, fallback = "Not set") {
  if (value == null || Number.isNaN(Number(value))) return fallback;
  return `${Math.round(Number(value))}%`;
}
