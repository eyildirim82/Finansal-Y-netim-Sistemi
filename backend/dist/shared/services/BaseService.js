"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../logger");
class BaseService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    createSuccessResponse(data, message = 'İşlem başarılı') {
        return {
            success: true,
            message,
            data
        };
    }
    createErrorResponse(message, error) {
        (0, logger_1.logError)(message, error);
        return {
            success: false,
            message,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
    validatePaginationParams(params) {
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 25));
        const sortBy = params.sortBy || 'createdAt';
        const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
        return { page, limit, sortBy, sortOrder };
    }
    createPaginatedResponse(data, total, page, limit) {
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
    async safeDatabaseOperation(operation, errorMessage = 'Veritabanı işlemi başarısız') {
        try {
            const result = await operation();
            return this.createSuccessResponse(result);
        }
        catch (error) {
            return this.createErrorResponse(errorMessage, error);
        }
    }
    async disconnect() {
        await this.prisma.$disconnect();
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=BaseService.js.map