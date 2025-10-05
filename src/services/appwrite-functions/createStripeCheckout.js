/**
 * Appwrite serverless function for creating a Stripe checkout session
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function(req, res) {
  // Parse request body
  const { amount, currency = 'usd', name, success_url, cancel_url } = req.body || {};
  
  if (!amount || !name || !success_url || !cancel_url) {
    return res.json({
      success: false,
      message: 'Missing required parameters',
    }, 400);
  }

  try {
    // Create a random product name from a list
    const productNames = [
      "Personal Development Ebook",
      "Financial Freedom Ebook",
      "Digital Marketing Guide",
      "Health & Wellness Ebook",
      "Productivity Masterclass",
      "Mindfulness & Meditation Guide",
      "Entrepreneurship Blueprint",
      "Wellness Program",
      "Success Coaching",
      "Executive Mentoring",
      "Learning Resources",
      "Online Course Access",
      "Premium Content Subscription",
      "Digital Asset Package"
    ];
    
    // Select a random product name
    const randomProductName = productNames[Math.floor(Math.random() * productNames.length)];
    
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      automatic_payment_methods: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: randomProductName,  // Use random name instead of actual video name
            },
            unit_amount: Math.round(amount),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
      // Completely disable customer email collection
      customer_creation: 'if_required',
      // Note: collect_shipping_address is not a supported parameter in this API version
      // Let Stripe decide when to collect billing address
      billing_address_collection: 'auto',
      // Disable automatic tax calculation to avoid additional requirements
      automatic_tax: { enabled: false },
      // Allow guest checkout without any customer info
      allow_promotion_codes: false,
      // Do not include customer_email when not available/valid
      // Use guest checkout mode
      payment_method_options: {
        card: {
          setup_future_usage: 'off_session',
        },
      },
      // Additional settings to minimize required fields
      submit_type: 'pay',
      // Disable customer portal
      customer_update: {
        address: 'never',
        name: 'never',
      },
    });

    return res.json({
      success: true,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.json({
      success: false,
      message: error.message,
    }, 500);
  }
}; 