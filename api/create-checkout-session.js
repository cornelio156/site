// Serverless function for creating Stripe checkout sessions
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Add CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get Stripe secret key from Supabase site_config or env
    let stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
    if (!stripeSecretKey) {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
        return res.status(500).json({ error: 'Supabase not configured on server' });
      }
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
      const { data: cfg, error: cfgErr } = await supabase
        .from('site_config')
        .select('stripe_secret_key')
        .limit(1)
        .maybeSingle();
      if (cfgErr) {
        console.error('Error fetching Stripe secret key from Supabase:', cfgErr);
        return res.status(500).json({ error: 'Failed to fetch Stripe credentials from Supabase', details: cfgErr.message });
      }
      stripeSecretKey = cfg?.stripe_secret_key || '';
    }
    
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }
    
    console.log('Stripe secret key found, initializing Stripe...');
    const stripe = new Stripe(stripeSecretKey);
    const { amount, currency = 'eur', name, success_url, cancel_url } = req.body;
    
    if (!amount || !success_url || !cancel_url) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

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
    
    // Define métodos de pagamento seguros baseados na moeda
    let paymentMethodTypes = ['card']; // Card é universal
    
    // Adicionar métodos específicos por região/moeda apenas se suportados
    if (currency.toLowerCase() === 'eur') {
      // Para EUR, podemos tentar adicionar SEPA (mas apenas se a conta suportar)
      try {
        const account = await stripe.accounts.retrieve();
        if (account.capabilities && account.capabilities.sepa_debit_payments === 'active') {
          paymentMethodTypes.push('sepa_debit');
        }
      } catch (accountError) {
        console.warn('Error checking account capabilities:', accountError.message);
      }
    }
    
    console.log(`Payment methods for ${currency.toUpperCase()}:`, paymentMethodTypes);
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: randomProductName,
            },
            unit_amount: Math.round(amount),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url,
      cancel_url,
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
}