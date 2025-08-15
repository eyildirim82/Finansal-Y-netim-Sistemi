import { PrismaClient } from '@prisma/client';
import { logError } from '../logger';
import { ApiResponse, PaginationParams, PaginatedResponse } from '../types';

export abstract class BaseService {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Başarılı API yanıtı oluşturur
   */
  protected createSuccessResponse<T>(data: T, message: string = 'İşlem başarılı'): ApiResponse<T> {
    return {
      success: true,
      message,
      data
    };
  }

  /**
   * Hata API yanıtı oluşturur
   */
  protected createErrorResponse(message: string, error?: any): ApiResponse {
    logError(message, error);
    return {
      success: false,
      message,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  /**
   * Sayfalama parametrelerini doğrular
   */
  protected validatePaginationParams(params: PaginationParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';

    return { page, limit, sortBy, sortOrder };
  }

  /**
   * Sayfalama yanıtı oluşturur
   */
  protected createPaginatedResponse<T>(
    data: T[], 
    total: number, 
    page: number, 
    limit: number
  ): PaginatedResponse<T> {
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Güvenli veritabanı işlemi yapar
   */
  protected async safeDatabaseOperation<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Veritabanı işlemi başarısız'
  ): Promise<ApiResponse<T>> {
    try {
      const result = await operation();
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(errorMessage, error);
    }
  }

  /**
   * Servis kapatma işlemi
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
