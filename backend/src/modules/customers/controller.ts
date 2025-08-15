import { Request, Response } from 'express';
import { CustomerService } from './service';
import { validate, customerValidations } from '../../shared/middleware/validation';

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  /**
   * Tüm müşterileri getir
   */
  getCustomers = async (req: Request, res: Response) => {
    try {
      const { page, limit, sortBy, sortOrder, address, accountType, tag1, tag2, isActive, type, hasDebt } = req.query;
      const params = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 25,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        address: (address as string) || undefined,
        accountType: (accountType as string) || undefined,
        tag1: (tag1 as string) || undefined,
        tag2: (tag2 as string) || undefined,
        isActive: typeof isActive === 'string' && isActive !== '' ? isActive === 'true' : undefined,
        type: (type as string) || undefined,
        hasDebt: typeof hasDebt === 'string' && hasDebt !== '' ? hasDebt === 'true' : undefined
      };

      // Kullanıcı ID'sini request'ten al
      const userId = req.user?.id;

      const result = await this.customerService.getCustomers(params, userId);
      
      if (result.success) {
        return res.json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Müşteriler getirilirken hata oluştu',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * ID ile müşteri getir
   */
  getCustomerById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.customerService.getCustomerById(id);
      
      if (result.success) {
        return res.json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Müşteri getirilirken hata oluştu',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Yeni müşteri oluştur
   */
  createCustomer = [
    validate(customerValidations),
    async (req: Request, res: Response) => {
      try {
        const result = await this.customerService.createCustomer(req.body);
        
        if (result.success) {
          return res.status(201).json(result);
        } else {
          return res.status(400).json(result);
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Müşteri oluşturulurken hata oluştu',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  ];

  /**
   * Müşteri güncelle
   */
  updateCustomer = [
    validate(customerValidations),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const result = await this.customerService.updateCustomer(id, req.body);
        
        if (result.success) {
          return res.json(result);
        } else {
          return res.status(400).json(result);
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Müşteri güncellenirken hata oluştu',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  ];

  /**
   * Müşteri sil
   */
  deleteCustomer = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.customerService.deleteCustomer(id);
      
      if (result.success) {
        return res.json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Müşteri silinirken hata oluştu',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Müşteri ara
   */
  searchCustomers = async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      const { page, limit, sortBy, sortOrder } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Arama terimi gerekli'
        });
      }

      const params = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await this.customerService.searchCustomers(q as string, params);
      
      if (result.success) {
        return res.json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Müşteri arama sırasında hata oluştu',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Vadesi geçmiş müşterileri getir
   */
  getOverdueCustomers = async (req: Request, res: Response) => {
    try {
      const result = await this.customerService.getOverdueCustomers();
      
      if (result.success) {
        return res.json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Vadesi geçmiş müşteriler getirilirken hata oluştu',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Müşteri istatistiklerini getir
   */
  getCustomerStats = async (req: Request, res: Response) => {
    try {
      console.log('📊 getCustomerStats - Request başladı');
      console.log('📊 getCustomerStats - User:', req.user);
      
      const { address, accountType, tag1, tag2, isActive, type, hasDebt } = req.query;
      const filters = {
        address: (address as string) || undefined,
        accountType: (accountType as string) || undefined,
        tag1: (tag1 as string) || undefined,
        tag2: (tag2 as string) || undefined,
        isActive: typeof isActive === 'string' && isActive !== '' ? isActive === 'true' : undefined,
        type: (type as string) || undefined,
        hasDebt: typeof hasDebt === 'string' && hasDebt !== '' ? hasDebt === 'true' : undefined
      };

      console.log('📊 getCustomerStats - Filters:', filters);

      // Kullanıcı ID'sini request'ten al
      const userId = req.user?.id;
      console.log('📊 getCustomerStats - UserId:', userId);

      const result = await this.customerService.getCustomerStats(filters, userId);
      console.log('📊 getCustomerStats - Service result:', result);
      
      if (result.success) {
        console.log('📊 getCustomerStats - Başarılı response gönderiliyor');
        return res.json(result);
      } else {
        console.log('📊 getCustomerStats - Hata response gönderiliyor');
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ getCustomerStats - Hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Müşteri istatistikleri getirilirken hata oluştu',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Tüm müşterileri sil
   */
  deleteAllCustomers = async (req: Request, res: Response) => {
    try {
      console.log('🗑️ deleteAllCustomers - Request başladı');
      console.log('🗑️ deleteAllCustomers - User:', req.user);
      
      // Kullanıcı ID'sini request'ten al
      const userId = req.user?.id;
      console.log('🗑️ deleteAllCustomers - UserId:', userId);

      const result = await this.customerService.deleteAllCustomers(userId);
      console.log('🗑️ deleteAllCustomers - Service result:', result);
      
      if (result.success) {
        console.log('🗑️ deleteAllCustomers - Başarılı response gönderiliyor');
        return res.json(result);
      } else {
        console.log('🗑️ deleteAllCustomers - Hata response gönderiliyor');
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ deleteAllCustomers - Hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Tüm müşteriler silinirken hata oluştu',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
