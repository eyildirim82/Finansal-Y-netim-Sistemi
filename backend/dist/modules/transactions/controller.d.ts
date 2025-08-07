import { Request, Response } from 'express';
export declare class TransactionController {
    static getAllTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getTransactionStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteMultipleTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=controller.d.ts.map