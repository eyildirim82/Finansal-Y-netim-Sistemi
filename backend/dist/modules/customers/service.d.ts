import { BaseService } from '../../shared/services/BaseService';
import { ApiResponse, PaginationParams, PaginatedResponse } from '../../shared/types';
import { Customer } from '@prisma/client';
export declare class CustomerService extends BaseService {
    getCustomers(params: PaginationParams & {
        address?: string;
        accountType?: string;
        tag1?: string;
        tag2?: string;
        isActive?: boolean;
        type?: string;
        hasDebt?: boolean;
    }, userId?: string): Promise<ApiResponse<PaginatedResponse<Customer>>>;
    getCustomerById(id: string): Promise<ApiResponse<Customer>>;
    createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Customer>>;
    updateCustomer(id: string, data: Partial<Customer>): Promise<ApiResponse<Customer>>;
    deleteCustomer(id: string): Promise<ApiResponse<boolean>>;
    searchCustomers(query: string, params: PaginationParams): Promise<ApiResponse<PaginatedResponse<Customer>>>;
    updateCustomerBalance(id: string, amount: number): Promise<ApiResponse<Customer>>;
    getOverdueCustomers(): Promise<ApiResponse<Customer[]>>;
    getCustomerStats(filters: {
        address?: string;
        accountType?: string;
        tag1?: string;
        tag2?: string;
        isActive?: boolean;
        type?: string;
        hasDebt?: boolean;
    }, userId?: string): Promise<ApiResponse<{
        total: number;
        active: number;
        debt: number;
        avgBalance: number;
    }>>;
    deleteAllCustomers(userId?: string): Promise<ApiResponse<{
        deletedCount: number;
    }>>;
}
//# sourceMappingURL=service.d.ts.map