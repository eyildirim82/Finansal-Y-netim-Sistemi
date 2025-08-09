"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportController = void 0;
const logger_1 = require("../../shared/logger");
const client_1 = require("@prisma/client");
const XLSX = __importStar(require("xlsx"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
class ImportController {
    static async importExcel(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Dosya yüklenmedi'
                });
            }
            const userId = req.user.id;
            const filePath = req.file.path;
            const fileExtension = path_1.default.extname(req.file.originalname).toLowerCase();
            if (!['.xlsx', '.xls'].includes(fileExtension)) {
                return res.status(400).json({
                    success: false,
                    message: 'Sadece Excel dosyaları (.xlsx, .xls) desteklenir'
                });
            }
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (data.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Dosya boş veya geçersiz format'
                });
            }
            const headers = data[0];
            const rows = data.slice(1);
            const requiredColumns = ['type', 'amount', 'description', 'date'];
            const missingColumns = requiredColumns.filter(col => !headers.includes(col));
            if (missingColumns.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Eksik sütunlar: ${missingColumns.join(', ')}`
                });
            }
            const processedData = [];
            const errors = [];
            const warnings = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowData = {};
                headers.forEach((header, index) => {
                    rowData[header] = row[index];
                });
                const validationResult = ImportController.validateTransactionData(rowData, i + 2);
                if (validationResult.isValid) {
                    processedData.push(validationResult.data);
                }
                else {
                    errors.push({
                        row: i + 2,
                        errors: validationResult.errors
                    });
                }
                if (validationResult.warnings.length > 0) {
                    warnings.push({
                        row: i + 2,
                        warnings: validationResult.warnings
                    });
                }
            }
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Dosyada hatalar bulundu',
                    errors,
                    warnings
                });
            }
            const savedTransactions = [];
            for (const transactionData of processedData) {
                try {
                    const transaction = await prisma.transaction.create({
                        data: {
                            ...transactionData,
                            userId
                        },
                        include: {
                            customer: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true
                                }
                            },
                            category: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    });
                    savedTransactions.push(transaction);
                }
                catch (error) {
                    errors.push({
                        row: transactionData.rowNumber,
                        errors: ['Veritabanına kaydedilemedi']
                    });
                }
            }
            return res.json({
                success: true,
                message: `${savedTransactions.length} işlem başarıyla içe aktarıldı`,
                data: {
                    imported: savedTransactions.length,
                    total: processedData.length,
                    warnings
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Excel import hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'Excel dosyası işlenirken bir hata oluştu'
            });
        }
    }
    static async importCSV(req, res) {
        return new Promise((resolve) => {
            try {
                if (!req.file) {
                    res.status(400).json({
                        success: false,
                        message: 'Dosya yüklenmedi'
                    });
                    return resolve(undefined);
                }
                const userId = req.user.id;
                const filePath = req.file.path;
                const fileExtension = path_1.default.extname(req.file.originalname).toLowerCase();
                if (fileExtension !== '.csv') {
                    res.status(400).json({
                        success: false,
                        message: 'Sadece CSV dosyaları (.csv) desteklenir'
                    });
                    return resolve(undefined);
                }
                const results = [];
                const errors = [];
                const warnings = [];
                let rowNumber = 2;
                (0, fs_1.createReadStream)(filePath)
                    .pipe((0, csv_parser_1.default)())
                    .on('data', (data) => {
                    const validationResult = ImportController.validateTransactionData(data, rowNumber);
                    if (validationResult.isValid) {
                        results.push(validationResult.data);
                    }
                    else {
                        errors.push({
                            row: rowNumber,
                            errors: validationResult.errors
                        });
                    }
                    if (validationResult.warnings.length > 0) {
                        warnings.push({
                            row: rowNumber,
                            warnings: validationResult.warnings
                        });
                    }
                    rowNumber++;
                })
                    .on('end', async () => {
                    try {
                        if (errors.length > 0) {
                            res.status(400).json({
                                success: false,
                                message: 'Dosyada hatalar bulundu',
                                errors,
                                warnings
                            });
                            return resolve(undefined);
                        }
                        const savedTransactions = [];
                        for (const transactionData of results) {
                            try {
                                const transaction = await prisma.transaction.create({
                                    data: {
                                        ...transactionData,
                                        userId
                                    },
                                    include: {
                                        customer: {
                                            select: {
                                                id: true,
                                                name: true,
                                                code: true
                                            }
                                        },
                                        category: {
                                            select: {
                                                id: true,
                                                name: true
                                            }
                                        }
                                    }
                                });
                                savedTransactions.push(transaction);
                            }
                            catch (error) {
                                errors.push({
                                    row: transactionData.rowNumber,
                                    errors: ['Veritabanına kaydedilemedi']
                                });
                            }
                        }
                        res.json({
                            success: true,
                            message: `${savedTransactions.length} işlem başarıyla içe aktarıldı`,
                            data: {
                                imported: savedTransactions.length,
                                total: results.length,
                                warnings
                            }
                        });
                        return resolve(undefined);
                    }
                    catch (error) {
                        (0, logger_1.logError)('CSV import hatası:', error);
                        res.status(500).json({
                            success: false,
                            message: 'CSV dosyası işlenirken bir hata oluştu'
                        });
                        return resolve(undefined);
                    }
                })
                    .on('error', (error) => {
                    (0, logger_1.logError)('CSV okuma hatası:', error);
                    res.status(500).json({
                        success: false,
                        message: 'CSV dosyası okunurken bir hata oluştu'
                    });
                    return resolve(undefined);
                });
            }
            catch (error) {
                (0, logger_1.logError)('CSV import hatası:', error);
                res.status(500).json({
                    success: false,
                    message: 'CSV dosyası işlenirken bir hata oluştu'
                });
                return resolve(undefined);
            }
        });
    }
    static async importCustomers(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Dosya yüklenmedi'
                });
            }
            const userId = req.user.id;
            const filePath = req.file.path;
            const fileExtension = path_1.default.extname(req.file.originalname).toLowerCase();
            if (!['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
                return res.status(400).json({
                    success: false,
                    message: 'Sadece Excel (.xlsx, .xls) ve CSV (.csv) dosyaları desteklenir'
                });
            }
            let data = [];
            if (['.xlsx', '.xls'].includes(fileExtension)) {
                const workbook = XLSX.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (rawData.length < 2) {
                    return res.status(400).json({
                        success: false,
                        message: 'Dosya boş veya geçersiz format'
                    });
                }
                const headers = rawData[0];
                const rows = rawData.slice(1);
                rows.forEach(row => {
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = row[index];
                    });
                    data.push(rowData);
                });
            }
            else {
                await new Promise((resolve, reject) => {
                    const results = [];
                    (0, fs_1.createReadStream)(filePath)
                        .pipe((0, csv_parser_1.default)())
                        .on('data', (row) => results.push(row))
                        .on('end', () => {
                        data = results;
                        resolve(undefined);
                    })
                        .on('error', (error) => {
                        reject(error);
                    });
                });
            }
            const requiredColumns = ['name'];
            const missingColumns = requiredColumns.filter(col => !Object.keys(data[0] || {}).includes(col));
            if (missingColumns.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Eksik sütunlar: ${missingColumns.join(', ')}`
                });
            }
            const processedData = [];
            const errors = [];
            const warnings = [];
            for (let i = 0; i < data.length; i++) {
                const rowData = data[i];
                const validationResult = ImportController.validateCustomerData(rowData, i + 2);
                if (validationResult.isValid) {
                    processedData.push(validationResult.data);
                }
                else {
                    errors.push({
                        row: i + 2,
                        errors: validationResult.errors
                    });
                }
                if (validationResult.warnings.length > 0) {
                    warnings.push({
                        row: i + 2,
                        warnings: validationResult.warnings
                    });
                }
            }
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Dosyada hatalar bulundu',
                    errors,
                    warnings
                });
            }
            const savedCustomers = [];
            for (const customerData of processedData) {
                try {
                    const customer = await prisma.customer.create({
                        data: {
                            ...customerData,
                            userId
                        }
                    });
                    savedCustomers.push(customer);
                }
                catch (error) {
                    errors.push({
                        row: customerData.rowNumber,
                        errors: ['Veritabanına kaydedilemedi']
                    });
                }
            }
            return res.json({
                success: true,
                message: `${savedCustomers.length} müşteri başarıyla içe aktarıldı`,
                data: {
                    imported: savedCustomers.length,
                    total: processedData.length,
                    warnings
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Müşteri import hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'Müşteri dosyası işlenirken bir hata oluştu'
            });
        }
    }
    static async downloadTemplate(req, res) {
        try {
            return res.status(501).json({ success: false, message: 'Henüz uygulanmadı' });
        }
        catch (error) {
            (0, logger_1.logError)('Template indirme hatası:', error);
            return res.status(500).json({ success: false, message: 'Template dosyası oluşturulurken bir hata oluştu' });
        }
    }
    static validateTransactionData(data, rowNumber) {
        const errors = [];
        const warnings = [];
        const processedData = { rowNumber };
        if (!data.type || !['INCOME', 'EXPENSE'].includes(data.type)) {
            errors.push('Geçersiz işlem tipi (INCOME veya EXPENSE olmalı)');
        }
        else {
            processedData.type = data.type;
        }
        if (!data.amount || isNaN(parseFloat(data.amount))) {
            errors.push('Geçersiz tutar');
        }
        else {
            processedData.amount = parseFloat(data.amount);
        }
        if (!data.description) {
            errors.push('Açıklama gerekli');
        }
        else {
            processedData.description = data.description;
        }
        if (!data.date) {
            errors.push('Tarih gerekli');
        }
        else {
            const date = new Date(data.date);
            if (isNaN(date.getTime())) {
                errors.push('Geçersiz tarih formatı');
            }
            else {
                processedData.date = date;
            }
        }
        if (data.customerId)
            processedData.customerId = data.customerId;
        if (data.categoryId)
            processedData.categoryId = data.categoryId;
        return {
            isValid: errors.length === 0,
            data: processedData,
            errors,
            warnings
        };
    }
    static validateCustomerData(data, rowNumber) {
        const errors = [];
        const warnings = [];
        const processedData = { rowNumber };
        if (!data.name || data.name.trim().length === 0) {
            errors.push('Müşteri adı gerekli');
        }
        else {
            processedData.name = data.name.trim();
        }
        if (data.code) {
            processedData.code = data.code;
        }
        else {
            processedData.code = `CUST_${(0, uuid_1.v4)()}`;
            warnings.push('Müşteri kodu otomatik oluşturuldu');
        }
        if (data.phone)
            processedData.phone = data.phone;
        if (data.address)
            processedData.address = data.address;
        if (data.type && ['INDIVIDUAL', 'CORPORATE'].includes(data.type)) {
            processedData.type = data.type;
        }
        else {
            processedData.type = 'INDIVIDUAL';
            warnings.push('Müşteri tipi varsayılan olarak INDIVIDUAL olarak ayarlandı');
        }
        if (data.accountType)
            processedData.accountType = data.accountType;
        if (data.tag1)
            processedData.tag1 = data.tag1;
        if (data.tag2)
            processedData.tag2 = data.tag2;
        return {
            isValid: errors.length === 0,
            data: processedData,
            errors,
            warnings
        };
    }
}
exports.ImportController = ImportController;
//# sourceMappingURL=controller.js.map