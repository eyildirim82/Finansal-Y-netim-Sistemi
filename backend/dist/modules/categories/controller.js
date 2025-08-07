"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const logger_1 = require("@/shared/logger");
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
class CategoryController {
    static async getAllCategories(req, res) {
        try {
            const { type, search } = req.query;
            const userId = req.user.id;
            const where = {};
            if (req.user.role !== 'ADMIN') {
                where.userId = userId;
            }
            if (type) {
                where.type = type;
            }
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ];
            }
            const categories = await prisma.category.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            transactions: true
                        }
                    }
                },
                orderBy: { name: 'asc' }
            });
            res.json(categories);
        }
        catch (error) {
            (0, logger_1.logError)('Kategoriler getirilirken hata:', error);
            res.status(500).json({
                success: false,
                message: 'Kategoriler getirilirken bir hata oluştu'
            });
        }
    }
    static async getCategory(req, res) {
        try {
            const { id } = req.params;
            const categoryId = id;
            const category = await prisma.category.findUnique({
                where: { id: categoryId },
                include: {
                    transactions: {
                        select: {
                            id: true,
                            type: true,
                            amount: true,
                            date: true,
                            description: true
                        },
                        orderBy: { date: 'desc' },
                        take: 10
                    },
                    _count: {
                        select: {
                            transactions: true
                        }
                    }
                }
            });
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Kategori bulunamadı'
                });
            }
            return res.json({
                success: true,
                data: category
            });
        }
        catch (error) {
            (0, logger_1.logError)('Kategori getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'Kategori getirilirken bir hata oluştu'
            });
        }
    }
    static async createCategory(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validasyon hatası',
                    errors: errors.array()
                });
            }
            const { name, type } = req.body;
            const userId = req.user.id;
            const existingCategory = await prisma.category.findFirst({
                where: {
                    name,
                    type,
                    userId
                }
            });
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu isimde bir kategori zaten mevcut'
                });
            }
            const category = await prisma.category.create({
                data: {
                    name,
                    type,
                    userId
                }
            });
            return res.status(201).json({
                success: true,
                message: 'Kategori başarıyla oluşturuldu',
                data: category
            });
        }
        catch (error) {
            (0, logger_1.logError)('Kategori oluşturma hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'Kategori oluşturulurken bir hata oluştu'
            });
        }
    }
    static async updateCategory(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validasyon hatası',
                    errors: errors.array()
                });
            }
            const { id } = req.params;
            const categoryId = id;
            const { name, type } = req.body;
            const userId = req.user.id;
            const existingCategory = await prisma.category.findUnique({
                where: { id: categoryId }
            });
            if (!existingCategory) {
                return res.status(404).json({
                    success: false,
                    message: 'Kategori bulunamadı'
                });
            }
            if (existingCategory.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bu kategoriyi düzenleme yetkiniz yok'
                });
            }
            const duplicateCategory = await prisma.category.findFirst({
                where: {
                    name,
                    type,
                    userId,
                    id: { not: categoryId }
                }
            });
            if (duplicateCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu isimde başka bir kategori zaten mevcut'
                });
            }
            const updatedCategory = await prisma.category.update({
                where: { id: categoryId },
                data: {
                    name,
                    type
                }
            });
            return res.json({
                success: true,
                message: 'Kategori başarıyla güncellendi',
                data: updatedCategory
            });
        }
        catch (error) {
            (0, logger_1.logError)('Kategori güncelleme hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'Kategori güncellenirken bir hata oluştu'
            });
        }
    }
    static async deleteCategory(req, res) {
        try {
            const { id } = req.params;
            const categoryId = id;
            const userId = req.user.id;
            const existingCategory = await prisma.category.findUnique({
                where: { id: categoryId },
                include: {
                    _count: {
                        select: {
                            transactions: true
                        }
                    }
                }
            });
            if (!existingCategory) {
                return res.status(404).json({
                    success: false,
                    message: 'Kategori bulunamadı'
                });
            }
            if (existingCategory.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bu kategoriyi silme yetkiniz yok'
                });
            }
            if (existingCategory._count.transactions > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu kategoriye bağlı işlemler bulunduğu için silinemez'
                });
            }
            await prisma.category.delete({
                where: { id: categoryId }
            });
            return res.json({
                success: true,
                message: 'Kategori başarıyla silindi'
            });
        }
        catch (error) {
            (0, logger_1.logError)('Kategori silme hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'Kategori silinirken bir hata oluştu'
            });
        }
    }
    static async getCategoryStats(req, res) {
        try {
            const { id } = req.params;
            const categoryIdNum = id;
            const userId = req.user.id;
            const category = await prisma.category.findUnique({
                where: { id: categoryIdNum }
            });
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Kategori bulunamadı'
                });
            }
            const incomeStats = await prisma.transaction.aggregate({
                where: {
                    categoryId: categoryIdNum,
                    type: 'INCOME',
                    userId
                },
                _sum: {
                    amount: true
                },
                _count: {
                    id: true
                }
            });
            const expenseStats = await prisma.transaction.aggregate({
                where: {
                    categoryId: categoryIdNum,
                    type: 'EXPENSE',
                    userId
                },
                _sum: {
                    amount: true
                },
                _count: {
                    id: true
                }
            });
            const recentTransactions = await prisma.transaction.findMany({
                where: { categoryId: categoryIdNum },
                orderBy: { date: 'desc' },
                take: 10,
                include: {
                    customer: true
                }
            });
            const stats = {
                category,
                summary: {
                    totalIncome: incomeStats._sum?.amount || 0,
                    totalExpense: expenseStats._sum?.amount || 0,
                    netAmount: (incomeStats._sum?.amount || 0) - (expenseStats._sum?.amount || 0),
                    incomeCount: incomeStats._count?.id || 0,
                    expenseCount: expenseStats._count?.id || 0,
                    totalCount: (incomeStats._count?.id || 0) + (expenseStats._count?.id || 0)
                },
                recentTransactions
            };
            return res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            (0, logger_1.logError)('Kategori istatistikleri hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'Kategori istatistikleri alınırken bir hata oluştu'
            });
        }
    }
    static async searchCategories(req, res) {
        try {
            const { q, type, page = 1, limit = 20 } = req.query;
            const userId = req.user.id;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            const skip = (pageNum - 1) * limitNum;
            const where = { userId };
            if (q) {
                where.name = {
                    contains: q,
                    mode: 'insensitive'
                };
            }
            if (type) {
                where.type = type;
            }
            const categories = await prisma.category.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            transactions: true
                        }
                    }
                },
                orderBy: { name: 'asc' },
                skip,
                take: limitNum
            });
            const total = await prisma.category.count({ where });
            return res.json({
                success: true,
                data: {
                    categories,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    }
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Kategori arama hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'Kategori arama sırasında bir hata oluştu'
            });
        }
    }
}
exports.CategoryController = CategoryController;
//# sourceMappingURL=controller.js.map