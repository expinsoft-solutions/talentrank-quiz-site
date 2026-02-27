import { createAdminClient } from '@/lib/supabase/admin';
import type { StripeSettings, PublicStripeSettings } from './types';

const SETTING_KEYS = [
  'stripe_enabled',
  'stripe_secret_key',
  'stripe_publishable_key',
  'stripe_webhook_secret',
  'stripe_price_id',
  'stripe_product_name',
  'stripe_product_description',
  'stripe_price_display',
] as const;

const PUBLIC_KEYS = [
  'stripe_enabled',
  'stripe_publishable_key',
  'stripe_price_id',
  'stripe_product_name',
  'stripe_product_description',
  'stripe_price_display',
] as const;

function parseStr(v: unknown): string {
  if (typeof v === 'string') return v.replace(/^"|"$/g, '');
  return '';
}

function parseBool(v: unknown): boolean {
  return v === true || v === 'true';
}

function envFallback<K extends keyof StripeSettings>(dbVal: string, envKey: string): string {
  if (dbVal) return dbVal;
  const v = process.env[envKey];
  return typeof v === 'string' ? v.trim() : '';
}

function envFallbackBool(dbVal: boolean, envKey: string): boolean {
  if (dbVal) return true;
  const v = process.env[envKey];
  return v === 'true' || v === '1';
}

function rowsToSettings(rows: { key: string; value: unknown }[]): StripeSettings {
  const map = new Map<string, unknown>();
  for (const row of rows) map.set(row.key, row.value);
  return {
    enabled: envFallbackBool(parseBool(map.get('stripe_enabled')), 'STRIPE_ENABLED'),
    secretKey: envFallback(parseStr(map.get('stripe_secret_key')), 'STRIPE_SECRET_KEY'),
    publishableKey: envFallback(parseStr(map.get('stripe_publishable_key')), 'STRIPE_PUBLISHABLE_KEY'),
    webhookSecret: envFallback(parseStr(map.get('stripe_webhook_secret')), 'STRIPE_WEBHOOK_SECRET'),
    priceId: envFallback(parseStr(map.get('stripe_price_id')), 'STRIPE_PRICE_ID'),
    productName: envFallback(parseStr(map.get('stripe_product_name')), 'STRIPE_PRODUCT_NAME'),
    productDescription: envFallback(parseStr(map.get('stripe_product_description')), 'STRIPE_PRODUCT_DESCRIPTION'),
    priceDisplay: envFallback(parseStr(map.get('stripe_price_display')), 'STRIPE_PRICE_DISPLAY'),
  };
}

export class StripeSettingsService {
  /** Full settings including secret keys — service role only */
  async getSettings(): Promise<StripeSettings> {
    const admin = createAdminClient();
    const { data: rows, error } = await admin
      .from('site_settings')
      .select('key, value')
      .in('key', [...SETTING_KEYS]);
    if (error) throw new Error(error.message);
    return rowsToSettings(rows ?? []);
  }

  /** Public-safe settings — no secret keys */
  async getPublicSettings(): Promise<PublicStripeSettings> {
    const admin = createAdminClient();
    const { data: rows, error } = await admin
      .from('site_settings')
      .select('key, value')
      .in('key', [...PUBLIC_KEYS]);
    if (error) throw new Error(error.message);
    const full = rowsToSettings(rows ?? []);
    return {
      enabled: full.enabled,
      publishableKey: full.publishableKey,
      priceId: full.priceId,
      productName: full.productName,
      productDescription: full.productDescription,
      priceDisplay: full.priceDisplay,
    };
  }

  async updateSettings(partial: Partial<StripeSettings>): Promise<void> {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const upsertRows: { key: string; value: unknown; updated_at: string }[] = [];

    if (typeof partial.enabled === 'boolean') {
      upsertRows.push({ key: 'stripe_enabled', value: partial.enabled, updated_at: now });
    }
    if (typeof partial.secretKey === 'string' && partial.secretKey !== '') {
      upsertRows.push({ key: 'stripe_secret_key', value: partial.secretKey, updated_at: now });
    }
    if (typeof partial.publishableKey === 'string') {
      upsertRows.push({ key: 'stripe_publishable_key', value: partial.publishableKey, updated_at: now });
    }
    if (typeof partial.webhookSecret === 'string' && partial.webhookSecret !== '') {
      upsertRows.push({ key: 'stripe_webhook_secret', value: partial.webhookSecret, updated_at: now });
    }
    if (typeof partial.priceId === 'string') {
      upsertRows.push({ key: 'stripe_price_id', value: partial.priceId, updated_at: now });
    }
    if (typeof partial.productName === 'string') {
      upsertRows.push({ key: 'stripe_product_name', value: partial.productName, updated_at: now });
    }
    if (typeof partial.productDescription === 'string') {
      upsertRows.push({ key: 'stripe_product_description', value: partial.productDescription, updated_at: now });
    }
    if (typeof partial.priceDisplay === 'string') {
      upsertRows.push({ key: 'stripe_price_display', value: partial.priceDisplay, updated_at: now });
    }

    if (upsertRows.length === 0) return;

    const { error } = await admin
      .from('site_settings')
      .upsert(upsertRows, { onConflict: 'key' });
    if (error) throw new Error(error.message);
  }
}
