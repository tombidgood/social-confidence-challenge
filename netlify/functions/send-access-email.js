// Fires automatically when Stripe confirms a real payment.
// Sends the buyer an email with a permanent link to their challenge.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const signature = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: 'Webhook signature verification failed' };
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    // Not the event we care about, just acknowledge it and stop.
    return { statusCode: 200, body: 'Ignored' };
  }

  const session = stripeEvent.data.object;

  // Only send for this specific £29 challenge, not other products/coaching.
  if (session.amount_total !== 2900) {
    return { statusCode: 200, body: 'Not this product, ignored' };
  }

  const customerEmail = session.customer_details && session.customer_details.email;

  if (!customerEmail) {
    return { statusCode: 200, body: 'No customer email found' };
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Tom Bidgood <onboarding@resend.dev>',
        to: customerEmail,
        subject: 'Your 21-Day Social Confidence Challenge is ready!',
        html: `
          <p>Thanks for joining the 21-Day Social Confidence Challenge!</p>
          <p>Here's your permanent link, bookmark this or keep this email safe:</p>
          <p><a href="https://socialconfidencechallenge.tombidgood.com/delivery-page.html">Access your challenge here</a></p>
          <p>See you on Day 1,<br>Tom</p>
        `,
      }),
    });
  } catch (err) {
    // Even if the email fails to send, don't error out to Stripe,
    // otherwise Stripe will keep retrying this webhook.
    console.error('Failed to send email', err);
  }

  return { statusCode: 200, body: 'OK' };
};
