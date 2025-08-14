/**
 * Para birimini formatlar
 * @param {number} amount - Formatlanacak miktar
 * @param {string} currency - Para birimi (varsayılan: 'TRY')
 * @param {string} locale - Locale (varsayılan: 'tr-TR')
 * @returns {string} Formatlanmış para birimi
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '-';
  
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Sayıyı para birimi olmadan formatlar
 * @param {number} amount - Formatlanacak miktar
 * @param {string} locale - Locale (varsayılan: 'tr-TR')
 * @returns {string} Formatlanmış sayı
 */
export const formatNumber = (amount, locale = 'tr-TR') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0,00';
  }

  try {
    return Number(amount).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (error) {
    return '0,00';
  }
};

/**
 * Para birimini kısa formatta gösterir (örn: 1.5K, 2.3M)
 * @param {number} amount - Formatlanacak miktar
 * @param {string} currency - Para birimi (varsayılan: '₺')
 * @returns {string} Kısa formatlanmış para birimi
 */
export const formatCurrencyShort = (amount, currency = '₺') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${currency}0`;
  }

  const num = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (num >= 1000000) {
    return `${sign}${currency}${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${sign}${currency}${(num / 1000).toFixed(1)}K`;
  } else {
    return `${sign}${currency}${num.toFixed(0)}`;
  }
};
