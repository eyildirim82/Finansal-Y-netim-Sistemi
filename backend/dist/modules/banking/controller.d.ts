import { Request, Response } from 'express';
export declare class BankingController {
    private emailService;
    private matchingService;
    constructor();
    fetchEmails(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    processEmail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getBankTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getUnmatchedPayments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    matchPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getEmailSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    testEmailConnection(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getMatchingStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    runAutoMatching(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private parseYapiKrediEmail;
    getEmailStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    fetchEmailsByDateRange(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    startRealtimeMonitoring(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    stopRealtimeMonitoring(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateEmailSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=controller.d.ts.map