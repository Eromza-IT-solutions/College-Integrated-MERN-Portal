import http from "./http";

// ---- API calls (all under /api/v1) ----
export async function listPayments(purpose, params = {}) {
  const { data } = await http.get("/payments", { params: { purpose, limit: 100, ...params } });
  return data.data;
}

export async function createOrder(body) {
  const { data } = await http.post("/payments/orders", body);
  return data.data; // { paymentId, amountPaise, gateway, gatewayOrderId, keyId, ... }
}

export async function verifyPayment(paymentId, { gatewayPaymentId, signature }) {
  const { data } = await http.post(`/payments/${paymentId}/verify`, { gatewayPaymentId, signature });
  return data.data;
}

export async function downloadReceiptPdf(paymentId, receiptNumber) {
  const res = await http.get(`/payments/${paymentId}/receipt`, { params: { format: "pdf" }, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${receiptNumber || paymentId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function listMyApplications() {
  const { data } = await http.get("/admissions/applications", { params: { limit: 100 } });
  return data.data;
}

export async function listMyExamForms() {
  const { data } = await http.get("/exam-forms", { params: { limit: 100 } });
  return data.data;
}

// ---- Gateway step: turns an order into { gatewayPaymentId, signature } ----
const FAKE_SECRET = "fake-gateway-secret"; // same demo constant as server/src/services/payment/fakeGateway.js

async function fakeCheckout(order) {
  if (!import.meta.env.DEV) throw new Error("The fake payment gateway works only in development");
  const gatewayPaymentId = `pay_fake_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(FAKE_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${order.gatewayOrderId}|${gatewayPaymentId}`));
  const signature = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { gatewayPaymentId, signature };
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the Razorpay checkout. Check your internet connection."));
    document.body.appendChild(s);
  });
}

async function razorpayCheckout(order, description) {
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.gatewayOrderId,
      amount: order.amountPaise,
      currency: order.currency || "INR",
      name: "EROMZA College Portal",
      description,
      handler: (r) => resolve({ gatewayPaymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
      modal: { ondismiss: () => reject(new Error("Payment window closed before paying")) },
    });
    rzp.on("payment.failed", (r) => reject(new Error(r?.error?.description || "Payment failed")));
    rzp.open();
  });
}

export function runCheckout(order, description) {
  return order.keyId ? razorpayCheckout(order, description) : fakeCheckout(order);
}

// Full flow: order -> checkout -> server verification. Returns the verified payment.
export async function payFee(orderBody, description) {
  const order = await createOrder(orderBody);
  const proof = await runCheckout(order, description);
  return verifyPayment(order.paymentId, proof);
}
