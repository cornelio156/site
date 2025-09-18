import { loadStripe, Stripe } from '@stripe/stripe-js';
import { createStripeCheckoutSession } from './api';

// Helper class for Stripe integration
export class StripeService {
  private static stripeInstance: Promise<Stripe | null> | null = null;

  /**
   * Initialize Stripe with the given publishable key
   */
  static initStripe(stripePublishableKey: string): Promise<Stripe | null> {
    if (!this.stripeInstance) {
      this.stripeInstance = loadStripe(stripePublishableKey);
    }
    return this.stripeInstance;
  }

  /**
   * Create a checkout session for a product
   */
  static async createCheckoutSession(
    amount: number,
    currency: string = 'usd',
    productName: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      const response = await createStripeCheckoutSession(
        amount,
        currency,
        productName,
        successUrl,
        cancelUrl
      );
      return response.sessionId;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Redirect to Stripe checkout
   */
  static async redirectToCheckout(sessionId: string): Promise<void> {
    const stripe = await this.stripeInstance;
    if (!stripe) {
      throw new Error('Stripe has not been initialized');
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      console.error('Error redirecting to checkout:', error);
      throw error;
    }
  }
} 