/**
 * Appwrite serverless function for creating a Stripe checkout session
 */
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

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
    // Resolve Stripe secret key: prefer Supabase admin config, fallback to env
    let stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase
          .from('site_config')
          .select('*')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        if (!error && data && data.stripe_secret_key) {
          stripeSecretKey = data.stripe_secret_key;
        }
      }
    } catch (cfgErr) {
      // If Supabase lookup fails, continue with env fallback
      console.warn('Supabase config lookup failed, using env STRIPE_SECRET_KEY if available');
    }

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured (Supabase or env)');
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2022-11-15' });

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
    
    // Create a Stripe checkout session with automatic payment methods
    const session = await stripe.checkout.sessions.create({
      // Enable Stripe to show all eligible methods automatically
      automatic_payment_methods: { enabled: true, allow_redirects: 'always' },
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: randomProductName,
            },
            unit_amount: Math.round(amount),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
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