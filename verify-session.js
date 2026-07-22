// Verifies a Stripe Checkout session actually completed payment.
// Called by the delivery page before it shows any content.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const sessionId = event.queryStringParameters && event.queryStringParameters.session_id;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ valid: false, error: 'No session_id provided' }),
    };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const valid = session.payment_status === 'paid';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid }),
    };
  } catch (err) {
    // Invalid, expired, or fake session ID all land here — treat as not paid.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: false }),
    };
  }
};
