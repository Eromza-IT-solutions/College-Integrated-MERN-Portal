import env from '../../config/env.js';
import { PAYMENT_GATEWAY, PAYMENT_GATEWAY_VALUES, RAZORPAY } from '../../utils/constants.js';
import { createFakeGateway } from './fakeGateway.js';
import { createRazorpayGateway } from './razorpayGateway.js';

let cached = null;

const allowedGatewayNames = [...PAYMENT_GATEWAY_VALUES].sort();

const credentialNames = {
  keyId: 'PAYMENT_KEY_ID',
  keySecret: 'PAYMENT_KEY_SECRET',
  webhookSecret: 'PAYMENT_WEBHOOK_SECRET',
};

function buildGateway(config = env.payment, activeNodeEnv = env.nodeEnv) {
  if (!PAYMENT_GATEWAY_VALUES.includes(config.gateway)) {
    throw new Error(`PAYMENT_GATEWAY must be one of: ${allowedGatewayNames.join(', ')}`);
  }

  if (config.gateway === PAYMENT_GATEWAY.RAZORPAY) {
    const missing = Object.keys(credentialNames).filter((key) => !config[key]).map((key) => credentialNames[key]);
    if (missing.length) throw new Error(`PAYMENT_GATEWAY=razorpay but ${missing.join(', ')} missing`);
    if (typeof config.keyId !== 'string' || !config.keyId.startsWith(RAZORPAY.testKeyPrefix)) {
      throw new Error(`PAYMENT_KEY_ID must start with ${RAZORPAY.testKeyPrefix}`);
    }
    return createRazorpayGateway(config);
  }

  if (activeNodeEnv === 'production') {
    throw new Error('PAYMENT_GATEWAY=fake is not allowed when NODE_ENV=production');
  }
  return createFakeGateway();
}

function getGateway() {
  if (!cached) cached = buildGateway();
  return cached;
}

function setGatewayForTests(gateway) {
  cached = gateway;
}

export { getGateway, buildGateway, setGatewayForTests };
