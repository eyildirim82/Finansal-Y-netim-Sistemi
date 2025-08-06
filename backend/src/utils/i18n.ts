import { Request } from 'express';

const messages = {
  tr: {
    CUSTOMERS_FETCH_ERROR: 'Müşteriler getirilirken bir hata oluştu',
    CUSTOMER_NOT_FOUND: 'Müşteri bulunamadı',
    CUSTOMER_FETCH_ERROR: 'Müşteri getirilirken bir hata oluştu',
    VALIDATION_ERROR: 'Validasyon hatası',
    CUSTOMER_CREATE_SUCCESS: 'Müşteri başarıyla oluşturuldu',
    CUSTOMER_CREATE_ERROR: 'Müşteri oluşturulurken bir hata oluştu',
    CUSTOMER_UPDATE_SUCCESS: 'Müşteri başarıyla güncellendi',
    CUSTOMER_UPDATE_ERROR: 'Müşteri güncellenirken bir hata oluştu',
    CUSTOMER_DELETE_HAS_TRANSACTIONS: 'İşlemleri olan müşteri silinemez',
    CUSTOMER_DELETE_ERROR: 'Müşteri silinirken bir hata oluştu',
    CUSTOMER_DELETE_SUCCESS: 'Müşteri başarıyla silindi',
    CUSTOMER_STATS_ERROR: 'Müşteri istatistikleri getirilirken bir hata oluştu',
    CUSTOMER_SEARCH_ERROR: 'Müşteri arama sırasında bir hata oluştu',
    CUSTOMER_ID_LIST_REQUIRED: 'Geçerli ID listesi gerekli',
    CUSTOMERS_NOT_FOUND: 'Bazı müşteriler bulunamadı',
    CUSTOMERS_DELETE_HAS_TRANSACTIONS: 'İşlemleri olan müşteriler silinemez',
    CUSTOMERS_DELETE_SUCCESS: '{count} müşteri başarıyla silindi',
    CUSTOMERS_DELETE_ERROR: 'Müşteriler silinirken bir hata oluştu',
    CUSTOMERS_FETCH_ERROR_LOG: 'Müşteriler getirilirken hata:',
    CUSTOMER_FETCH_ERROR_LOG: 'Müşteri getirilirken hata:',
    CUSTOMER_CREATE_ERROR_LOG: 'Müşteri oluşturulurken hata:',
    CUSTOMER_UPDATE_ERROR_LOG: 'Müşteri güncellenirken hata:',
    CUSTOMER_DELETE_ERROR_LOG: 'Müşteri silinirken hata:',
    CUSTOMER_STATS_ERROR_LOG: 'Müşteri istatistikleri getirilirken hata:',
    CUSTOMER_SEARCH_ERROR_LOG: 'Müşteri arama hatası:',
    CUSTOMERS_DELETE_ERROR_LOG: 'Toplu müşteri silme hatası:'
  },
  en: {
    CUSTOMERS_FETCH_ERROR: 'An error occurred while fetching customers',
    CUSTOMER_NOT_FOUND: 'Customer not found',
    CUSTOMER_FETCH_ERROR: 'An error occurred while fetching the customer',
    VALIDATION_ERROR: 'Validation error',
    CUSTOMER_CREATE_SUCCESS: 'Customer created successfully',
    CUSTOMER_CREATE_ERROR: 'An error occurred while creating the customer',
    CUSTOMER_UPDATE_SUCCESS: 'Customer updated successfully',
    CUSTOMER_UPDATE_ERROR: 'An error occurred while updating the customer',
    CUSTOMER_DELETE_HAS_TRANSACTIONS: 'Cannot delete a customer with transactions',
    CUSTOMER_DELETE_ERROR: 'An error occurred while deleting the customer',
    CUSTOMER_DELETE_SUCCESS: 'Customer deleted successfully',
    CUSTOMER_STATS_ERROR: 'An error occurred while fetching customer statistics',
    CUSTOMER_SEARCH_ERROR: 'An error occurred during customer search',
    CUSTOMER_ID_LIST_REQUIRED: 'A valid ID list is required',
    CUSTOMERS_NOT_FOUND: 'Some customers were not found',
    CUSTOMERS_DELETE_HAS_TRANSACTIONS: 'Customers with transactions cannot be deleted',
    CUSTOMERS_DELETE_SUCCESS: '{count} customers deleted successfully',
    CUSTOMERS_DELETE_ERROR: 'An error occurred while deleting customers',
    CUSTOMERS_FETCH_ERROR_LOG: 'Error fetching customers:',
    CUSTOMER_FETCH_ERROR_LOG: 'Error fetching customer:',
    CUSTOMER_CREATE_ERROR_LOG: 'Error creating customer:',
    CUSTOMER_UPDATE_ERROR_LOG: 'Error updating customer:',
    CUSTOMER_DELETE_ERROR_LOG: 'Error deleting customer:',
    CUSTOMER_STATS_ERROR_LOG: 'Error fetching customer statistics:',
    CUSTOMER_SEARCH_ERROR_LOG: 'Customer search error:',
    CUSTOMERS_DELETE_ERROR_LOG: 'Bulk customer delete error:'
  }
} as const;

export type Locale = keyof typeof messages;
export type MessageKey = keyof typeof messages['tr'];

function getLocale(req: Request): Locale {
  const header = req.headers['accept-language'];
  if (typeof header === 'string') {
    const locale = header.split(',')[0].split('-')[0] as Locale;
    if (locale in messages) {
      return locale;
    }
  }
  return 'tr';
}

export function t(req: Request, key: MessageKey, vars?: Record<string, string | number>): string {
  const locale = getLocale(req);
  let text: string = messages[locale][key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export default { t };
