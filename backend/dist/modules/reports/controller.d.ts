import { Request, Response } from 'express';
export declare class ReportController {
    static getDashboardSummary(req: Request, res: Response): Promise<void>;
    static getMonthlyTrend(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCategoryReport(req: Request, res: Response): Promise<void>;
    static getCustomerReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getDailyTrend(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCashFlowReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getIntegratedDashboard(req: Request, res: Response): Promise<void>;
    private static getBasicFinancialStats;
    private static getExtractStats;
    private static getBankingStats;
    private static getCashStats;
    static getCollectionReport(req: Request, res: Response): Promise<void>;
    static getAgingAnalysis(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=controller.d.ts.map