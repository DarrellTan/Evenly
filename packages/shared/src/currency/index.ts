export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
];

export interface OfflineRateCache {
  base: string; // e.g. "USD"
  updated_at: string; // ISO 8601
  rates: Record<string, number>; // e.g. { JPY: 155.2, EUR: 0.92, MYR: 4.45 }
}

/**
 * Converts an amount from one currency to another using a base exchange rate map.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rateMap: Record<string, number>,
  baseCurrency = 'USD'
): number {
  if (fromCurrency === toCurrency) return amount;

  // Rate relative to base
  const fromRate = fromCurrency === baseCurrency ? 1 : rateMap[fromCurrency];
  const toRate = toCurrency === baseCurrency ? 1 : rateMap[toCurrency];

  if (!fromRate || !toRate) {
    throw new Error(`Missing exchange rate for ${fromCurrency} or ${toCurrency}`);
  }

  // Convert from currency -> base currency -> to currency
  const inBase = amount / fromRate;
  const inTarget = inBase * toRate;

  return Math.round((inTarget + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  const symbol = currency?.symbol || currencyCode;
  return `${symbol} ${amount.toFixed(2)}`;
}
