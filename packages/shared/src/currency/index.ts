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

export const DEFAULT_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  JPY: 155.0,
  GBP: 0.78,
  MYR: 4.45,
  SGD: 1.34,
  THB: 36.5,
  AUD: 1.52,
  KRW: 1370.0,
  CAD: 1.36,
  CHF: 0.90,
  IDR: 16000.0,
  VND: 25000.0,
  TWD: 32.0,
  HKD: 7.82,
};

export interface OfflineRateCache {
  base: string;
  updated_at: string;
  rates: Record<string, number>;
}

/**
 * Converts an amount from one currency to another using a base exchange rate map.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rateMap: Record<string, number> = DEFAULT_RATES,
  baseCurrency = 'USD'
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = fromCurrency === baseCurrency ? 1 : rateMap[fromCurrency];
  const toRate = toCurrency === baseCurrency ? 1 : rateMap[toCurrency];

  if (!fromRate || !toRate) {
    return amount;
  }

  const inBase = amount / fromRate;
  const inTarget = inBase * toRate;

  return Math.round((inTarget + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  const symbol = currency?.symbol || currencyCode;
  return `${symbol} ${amount.toFixed(2)}`;
}
