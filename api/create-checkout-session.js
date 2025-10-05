// Serverless function for creating Stripe checkout sessions
import Stripe from 'stripe';
import { Client, Databases } from 'node-appwrite';

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
    // First, get the Stripe secret key from Appwrite
    let stripeSecretKey = '';
    
    // Use Vercel environment variables (sem VITE_ prefix para serverless)
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    
    if (!projectId || !apiKey) {
      console.error('Missing Appwrite credentials:', { projectId: !!projectId, apiKey: !!apiKey });
      return res.status(500).json({ 
        error: 'Appwrite credentials not configured in Vercel environment variables' 
      });
    }
    
    const client = new Client()
      .setEndpoint('https://fra.cloud.appwrite.io/v1') // Endpoint fixo
      .setProject(projectId)
      .setKey(apiKey);
      
    const databases = new Databases(client);
    
    try {
      // Get site config from Appwrite
      const response = await databases.listDocuments(
        'video_site_db', // Database ID fixo
        'site_config'  // Site Config Collection ID fixo
      );
      
      if (response.documents.length > 0) {
        const config = response.documents[0];
        stripeSecretKey = config.stripe_secret_key;
      }
    } catch (appwriteError) {
      console.error('Error fetching Stripe secret key from Appwrite:', appwriteError);
      return res.status(500).json({ 
        error: 'Failed to fetch Stripe credentials from Appwrite',
        details: appwriteError.message
      });
    }
    
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe secret key not found in Appwrite configuration' });
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
      // Try to make email optional when possible
      customer_email_optional: true,
      // Allow payments without requiring customer information
      payment_method_options: {
        card: {
          setup_future_usage: 'off_session',
        },
      },
      // Disable automatic tax calculation to avoid additional requirements
      automatic_tax: { enabled: false },
      // Allow guest checkout
      allow_promotion_codes: false,
      // Disable billing address collection to reduce friction
      billing_address_collection: 'auto',
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
}