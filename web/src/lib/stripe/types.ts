export interface StripeSettings {
  enabled: boolean;
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  priceId: string;
  productName: string;
  productDescription: string;
  priceDisplay: string;
}

/** Safe to expose to the browser — no secret keys */
export type PublicStripeSettings = Omit<StripeSettings, 'secretKey' | 'webhookSecret'>;
