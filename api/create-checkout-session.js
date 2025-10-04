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
    // First, get the Stripe secret key from Supabase
    let stripeSecretKey = '';
    
    // Use Vercel environment variables for Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
      return res.status(500).json({ 
        error: 'Supabase credentials not configured in Vercel environment variables' 
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
      // Get site config from Supabase
      const { data: siteConfig, error } = await supabase
        .from('site_config')
        .select('stripe_secret_key')
        .order('id', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching site config from Supabase:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch site config from Supabase',
          details: error.message
        });
      }
      
      if (siteConfig) {
        stripeSecretKey = siteConfig.stripe_secret_key;
      }
    } catch (supabaseError) {
      console.error('Error fetching Stripe secret key from Supabase:', supabaseError);
      return res.status(500).json({ 
        error: 'Failed to fetch Stripe credentials from Supabase',
        details: supabaseError.message
      });
    }
    
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe secret key not found in Supabase configuration' });
    }
    
    console.log('Stripe secret key found, initializing Stripe...');
    const stripe = new Stripe(stripeSecretKey);
    const { amount, currency = 'usd', name, success_url, cancel_url } = req.body;
    
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