import env from '../../config/env.js';
import { PAYMENT_GATEWAY } from '../../utils/constants.js';
import { createFakeGateway } from './fakeGateway.js';
import { createRazorpayGateway } from './razorpayGateway.js';

// One place that decides which gateway the server talks to. Everything else asks for getGateway()
// and never knows whether it is the fake one or Razorpay.
//   PAYMENT_GATEWAY=fake       (default) no keys needed
//   PAYMENT_GATEWAY=razorpay   needs PAYMENT_KEY_ID, PAYMENT_KEY_SECRET, PAYMENT_WEBHOOK_SECRET
let cached = null;

function buildGateway(config = env.payment) {
  if (config.gateway === PAYMENT_GATEWAY.RAZORPAY) {
    const missing = ['keyId', 'keySecret', 'webhookSecret'].filter((k) => !config[k]);
    if (missing.length) throw new Error(`PAYMENT_GATEWAY=razorpay but these are missing in .env: ${missing.join(', ')}`);
    if (!config.keyId.startsWith('rzp_test_')) throw new Error('Only Razorpay TEST keys (rzp_test_...) are allowed: this demo takes no real money');
    return createRazorpayGateway(config);
  }
  if (config.gateway === PAYMENT_GATEWAY.FAKE) {
    if (env.nodeEnv === 'production') throw new Error('The fake payment gateway cannot be used when NODE_ENV=production');
    return createFakeGateway();
  }
  throw new Error(`Unknown PAYMENT_GATEWAY "${config.gateway}"`);
}

function getGateway() {
  if (!cached) cached = buildGateway();
  return cached;
}

/** Tests can put in their own gateway (or null to forget it). */
function setGatewayForTests(gateway) {
  cached = gateway;
}

export { getGateway, buildGateway, setGatewayForTests };
