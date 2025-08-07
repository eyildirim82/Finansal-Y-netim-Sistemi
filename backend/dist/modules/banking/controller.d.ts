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
}
//# sourceMappingURL=controller.d.ts.map