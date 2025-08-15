"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const service_1 = require("./service");
const validation_1 = require("../../shared/middleware/validation");
class CustomerController {
    constructor() {
        this.getCustomers = async (req, res) => {
            try {
                const { page, limit, sortBy, sortOrder, address, accountType, tag1, tag2, isActive, type, hasDebt } = req.query;
                const params = {
                    page: page ? parseInt(page) : 1,
                    limit: limit ? parseInt(limit) : 25,
                    sortBy: sortBy,
                    sortOrder: sortOrder,
                    address: address || undefined,
                    accountType: accountType || undefined,
                    tag1: tag1 || undefined,
                    tag2: tag2 || undefined,
                    isActive: typeof isActive === 'string' && isActive !== '' ? isActive === 'true' : undefined,
                    type: type || undefined,
                    hasDebt: typeof hasDebt === 'string' && hasDebt !== '' ? hasDebt === 'true' : undefined
                };
                const userId = req.user?.id;
                const result = await this.customerService.getCustomers(params, userId);
                if (result.success) {
                    return res.json(result);
                }
                else {
                    return res.status(400).json(result);
                }
            }
            catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Müşteriler getirilirken hata oluştu',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
        this.getCustomerById = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.customerService.getCustomerById(id);
                if (result.success) {
                    return res.json(result);
                }
                else {
                    return res.status(404).json(result);
                }
            }
            catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Müşteri getirilirken hata oluştu',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
        this.createCustomer = [
            (0, validation_1.validate)(validation_1.customerValidations),
            async (req, res) => {
                try {
                    const result = await this.customerService.createCustomer(req.body);
                    if (result.success) {
                        return res.status(201).json(result);
                    }
                    else {
                        return res.status(400).json(result);
                    }
                }
                catch (error) {
                    return res.status(500).json({
                        success: false,
                        message: 'Müşteri oluşturulurken hata oluştu',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        ];
        this.updateCustomer = [
            (0, validation_1.validate)(validation_1.customerValidations),
            async (req, res) => {
                try {
                    const { id } = req.params;
                    const result = await this.customerService.updateCustomer(id, req.body);
                    if (result.success) {
                        return res.json(result);
                    }
                    else {
                        return res.status(400).json(result);
                    }
                }
                catch (error) {
                    return res.status(500).json({
                        success: false,
                        message: 'Müşteri güncellenirken hata oluştu',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        ];
        this.deleteCustomer = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.customerService.deleteCustomer(id);
                if (result.success) {
                    return res.json(result);
                }
                else {
                    return res.status(400).json(result);
                }
            }
            catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Müşteri silinirken hata oluştu',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
        this.searchCustomers = async (req, res) => {
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
                    page: page ? parseInt(page) : 1,
                    limit: limit ? parseInt(limit) : 10,
                    sortBy: sortBy,
                    sortOrder: sortOrder
                };
                const result = await this.customerService.searchCustomers(q, params);
                if (result.success) {
                    return res.json(result);
                }
                else {
                    return res.status(400).json(result);
                }
            }
            catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Müşteri arama sırasında hata oluştu',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
        this.getOverdueCustomers = async (req, res) => {
            try {
                const result = await this.customerService.getOverdueCustomers();
                if (result.success) {
                    return res.json(result);
                }
                else {
                    return res.status(400).json(result);
                }
            }
            catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Vadesi geçmiş müşteriler getirilirken hata oluştu',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
        this.getCustomerStats = async (req, res) => {
            try {
                console.log('📊 getCustomerStats - Request başladı');
                console.log('📊 getCustomerStats - User:', req.user);
                const { address, accountType, tag1, tag2, isActive, type, hasDebt } = req.query;
                const filters = {
                    address: address || undefined,
                    accountType: accountType || undefined,
                    tag1: tag1 || undefined,
                    tag2: tag2 || undefined,
                    isActive: typeof isActive === 'string' && isActive !== '' ? isActive === 'true' : undefined,
                    type: type || undefined,
                    hasDebt: typeof hasDebt === 'string' && hasDebt !== '' ? hasDebt === 'true' : undefined
                };
                console.log('📊 getCustomerStats - Filters:', filters);
                const userId = req.user?.id;
                console.log('📊 getCustomerStats - UserId:', userId);
                const result = await this.customerService.getCustomerStats(filters, userId);
                console.log('📊 getCustomerStats - Service result:', result);
                if (result.success) {
                    console.log('📊 getCustomerStats - Başarılı response gönderiliyor');
                    return res.json(result);
                }
                else {
                    console.log('📊 getCustomerStats - Hata response gönderiliyor');
                    return res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('❌ getCustomerStats - Hata:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Müşteri istatistikleri getirilirken hata oluştu',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
        this.deleteAllCustomers = async (req, res) => {
            try {
                const userId = req.user?.id;
                const result = await this.customerService.deleteAllCustomers(userId);
                if (result.success) {
                    return res.json(result);
                }
                else {
                    return res.status(400).json(result);
                }
            }
            catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Tüm müşteriler silinirken hata oluştu',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
        this.customerService = new service_1.CustomerService();
    }
}
exports.CustomerController = CustomerController;
//# sourceMappingURL=controller.js.map