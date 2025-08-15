export interface PDFTransaction {
    date: Date;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    transactionType?: string;
    reference?: string;
}
export interface PDFParseResult {
    transactions: PDFTransaction[];
    accountInfo: {
        accountNumber?: string;
        accountHolder?: string;
        startDate?: Date;
        endDate?: Date;
        startBalance?: number;
        endBalance?: number;
    };
    summary: {
        totalDebit: number;
        totalCredit: number;
        transactionCount: number;
    };
}
export declare class PDFParserService {
    parsePDF(filePath: string): Promise<PDFParseResult>;
    private extractAccountInfo;
    private parseTransactions;
    private isTransactionHeader;
    private isTotalRow;
    private containsDate;
    private findAmountPositions;
    private parseTransactionLine;
    private parseDate;
    private parseAmount;
    private calculateSummary;
    detectMissingTransactions(pdfTransactions: PDFTransaction[], existingTransactions?: any[]): Promise<{
        missingTransactions: any[];
        summary: any;
    }>;
    private groupGapsByDate;
    private calculateConfidence;
    private calculateAverageConfidence;
    private calculateSeverity;
    private isYapiKrediPDF;
    private parseYapiKrediPDF;
    private extractYapiKrediAccountInfo;
    private parseYapiKrediTransactions;
    private parseYapiKrediTransactionLine;
}
//# sourceMappingURL=pdfParserService.d.ts.map