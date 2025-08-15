export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Customer extends BaseEntity {
    code: string;
    name: string;
    originalName?: string;
    nameVariations?: string;
    phone?: string;
    address?: string;
    type: string;
    accountType?: string;
    lastPaymentDate?: Date;
    paymentPattern?: string;
    dueDays?: number;
    tag1?: string;
    tag2?: string;
    isActive: boolean;
    userId: string;
    balance?: Balance;
}
export interface Balance {
    id: string;
    customerId: string;
    totalDebit: number;
    totalCredit: number;
    netBalance: number;
    lastUpdated: Date;
}
export interface Transaction extends BaseEntity {
    type: string;
    amount: number;
    currency: string;
    description?: string;
    date: Date;
    categoryId?: string;
    customerId?: string;
    userId: string;
    sourceFile?: string;
    sourceRow?: number;
    metadata?: string;
}
export interface Category extends BaseEntity {
    name: string;
    type: string;
    parentId?: string;
    userId?: string;
}
export interface BankTransaction extends BaseEntity {
    messageId: string;
    bankCode: string;
    direction: string;
    accountIban: string;
    maskedAccount?: string;
    transactionDate: Date;
    amount: number;
    senderName?: string;
    counterpartyName?: string;
    balanceAfter?: number;
    isMatched: boolean;
    matchedCustomerId?: string;
    confidenceScore?: number;
    rawEmailData?: string;
    parsedData?: string;
    processedAt?: Date;
}
//# sourceMappingURL=index.d.ts.map