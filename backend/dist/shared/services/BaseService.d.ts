import { PrismaClient } from '@prisma/client';
import { ApiResponse, PaginationParams, PaginatedResponse } from '../types';
export declare abstract class BaseService {
    protected prisma: PrismaClient;
    constructor();
    protected createSuccessResponse<T>(data: T, message?: string): ApiResponse<T>;
    protected createErrorResponse(message: string, error?: any): ApiResponse;
    protected validatePaginationParams(params: PaginationParams): {
        page: number;
        limit: number;
        sortBy: string;
        sortOrder: string;
    };
    protected createPaginatedResponse<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T>;
    protected safeDatabaseOperation<T>(operation: () => Promise<T>, errorMessage?: string): Promise<ApiResponse<T>>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=BaseService.d.ts.map