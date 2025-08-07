export declare class YapiKrediFASTEmailService {
    private imap;
    private isConnected;
    private failedLogPath;
    private patterns;
    private config;
    private metrics;
    constructor();
    connect(): Promise<boolean>;
    disconnect(): Promise<void>;
    fetchYapiKrediFASTEmails(): Promise<any[]>;
    fetchEmailsBatch(criteria: any): Promise<any[]>;
    processBatchWithConcurrency(batch: any[], concurrencyLimit: number): Promise<any[]>;
    private processEmailItem;
    getMetrics(): {
        totalEmails: number;
        processedEmails: number;
        failedEmails: number;
        totalProcessingTime: number;
        avgProcessingTime: number;
        emailsPerSecond: number;
        retryCount: number;
    };
    resetMetrics(): void;
    parseYapiKrediFASTEmail(mail: any): Promise<any>;
    testConnection(): Promise<boolean>;
    detectDirection(mail: any, bodyText: string): string;
    cleanHtml(html: string): string;
    parseDate(str: string): Date | null;
    parseAmount(str: string): number;
    startRealtimeMonitoring(callback: (transaction: any) => void): Promise<void>;
}
//# sourceMappingURL=emailService.d.ts.map