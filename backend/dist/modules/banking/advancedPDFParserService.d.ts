export interface AdvancedPDFTransaction {
    id?: string;
    date_time: Date;
    date_time_iso: string;
    description: string;
    debit: number;
    credit: number;
    amount: number;
    currency: string;
    balance: number;
    balance_currency: string;
    op?: string;
    channel?: string;
    direction?: string;
    counterparty_name?: string;
    counterparty_iban?: string;
    category?: string;
    subcategory?: string;
    hash: string;
    raw: string;
    confidence: number;
    anomalies?: string[];
}
export interface AdvancedPDFParseResult {
    transactions: AdvancedPDFTransaction[];
    accountInfo: {
        accountNumber?: string;
        accountHolder?: string;
        startDate?: Date;
        endDate?: Date;
        startBalance?: number;
        endBalance?: number;
        iban?: string;
    };
    summary: {
        totalDebit: number;
        totalCredit: number;
        transactionCount: number;
        successRate: number;
        rejectedCount: number;
        anomalyCount: number;
        categoryDistribution: Record<string, number>;
    };
    quality: {
        balanceReconciliation: {
            anomalies: Array<{
                lineNumber: number;
                expectedBalance: number;
                actualBalance: number;
                difference: number;
            }>;
            totalAnomalies: number;
        };
        duplicates: {
            count: number;
            hashes: string[];
        };
        rejected: {
            count: number;
            lines: Array<{
                lineNumber: number;
                raw: string;
                reason: string;
            }>;
        };
    };
}
export declare class AdvancedPDFParserService {
    private static readonly DATETIME_HEAD;
    private static readonly TR_AMOUNT_RE;
    private static readonly CCY_RE;
    private static readonly AMT_CCY_G;
    parsePDF(filePath: string): Promise<AdvancedPDFParseResult>;
    private extractTextAndLines;
    private cleanLine;
    private findRecordBoundaries;
    private isRecordStart;
    private parseRecordFields;
    private extractFinancialData;
    private extractDescription;
    private normalizeRecords;
    private normalizeDateTime;
    private normalizeAmount;
    private normalizeText;
    private enrichRecords;
    private categorizeTransaction;
    private extractOperationInfo;
    private extractCounterparty;
    private generateHash;
    private performQualityChecks;
    private mapToStorageFormat;
    private extractAccountInfo;
    private calculateSummary;
    private generateQualityReport;
    private parseDate;
    private parseAmount;
}
//# sourceMappingURL=advancedPDFParserService.d.ts.map