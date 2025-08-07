export declare class PaymentMatchingService {
    private prisma;
    constructor();
    normalizeCustomerName(name: string): string;
    calculateNameSimilarity(name1: string, name2: string): number;
    checkNameVariations(customerName: string, transactionName: string): {
        match: boolean;
        confidence: number;
        method: string;
    };
    checkAmountPattern(transactionAmount: number, customerId: string): Promise<{
        match: boolean;
        confidence: number;
        method: string;
    }>;
    checkIBANMatch(transactionIBAN: string, customerIBAN: string | null): {
        match: boolean;
        confidence: number;
        method: string;
    };
    getCustomers(): Promise<any[]>;
    matchTransaction(transaction: any): Promise<{
        matched: boolean;
        customer?: any;
        confidence: number;
        methods: string[];
        allMatches?: any[];
        error?: string;
    }>;
    saveMatchResult(transactionId: string, matchResult: any): Promise<boolean>;
    getUnmatchedTransactions(limit?: number): Promise<any[]>;
    confirmMatch(matchId: string, confirmed?: boolean): Promise<boolean>;
    getMatchingStatistics(): Promise<any>;
}
//# sourceMappingURL=paymentMatchingService.d.ts.map