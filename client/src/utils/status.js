const STATUS_VARIANTS = {
  active: "success",
  published: "success",
  approved: "success",
  verified: "success",
  paid: "success",
  completed: "success",
  admitted: "success",
  issued: "success",
  live: "success",
  open: "success",
  passed: "success",
  success: "success",
  ready: "success",
  closed: "neutral",
  pending: "warning",
  review: "warning",
  "under review": "warning",
  draft: "warning",
  scheduled: "warning",
  unpaid: "warning",
  "in progress": "warning",
  processing: "warning",
  "refund requested": "warning",
  refunded: "info",
  submitted: "info",
  new: "info",
  rejected: "error",
  failed: "error",
  blocked: "error",
  overdue: "error",
  cancelled: "error",
  expired: "error",
  deactivated: "error",
  absent: "error",
};

export function getStatusVariant(status) {
  return STATUS_VARIANTS[String(status).toLowerCase()] ?? "neutral";
}

export function formatStatus(status) {
  return String(status)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
