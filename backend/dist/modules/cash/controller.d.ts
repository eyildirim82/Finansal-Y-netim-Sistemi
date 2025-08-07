import { Request, Response } from 'express';
export declare class CashController {
    createCashFlow(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCashFlows(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCurrentBalance(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    countCash(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCashReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    addCashTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCashTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=controller.d.ts.map