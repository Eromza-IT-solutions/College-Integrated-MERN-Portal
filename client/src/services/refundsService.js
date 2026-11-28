import http from "./http";

// Refunds (/api/v1/refunds). The server decides who may do what:
//   Admission Admin / Exam Admin raise a refund, Super Admin approves or rejects it (never the same person).
const asPage = ({ data }) => ({ rows: data.data, meta: data.meta });
const asOne = ({ data }) => data.data;

export const listRefunds = async (purpose, params = {}) =>
  asPage(await http.get("/refunds", { params: { purpose, limit: 20, ...params } }));

// body: { paymentId, amountPaise, reason }
export const requestRefund = async (body) => asOne(await http.post("/refunds", body));

// body: { approve: true } or { approve: false, note: "why" }
export const decideRefund = async (id, body) => asOne(await http.post(`/refunds/${id}/decision`, body));

// Send an approved refund again after the payment gateway had failed.
export const retryRefund = async (id) => asOne(await http.post(`/refunds/${id}/retry`));
