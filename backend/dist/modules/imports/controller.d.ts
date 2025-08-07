import { Request, Response } from 'express';
export declare class ImportController {
    static importExcel(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static importCSV(req: Request, res: Response): Promise<void>;
    static importCustomers(req: Request, res: Response): Promise<unknown>;
    private static validateTransactionData;
    private static validateCustomerData;
    static downloadTemplate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=controller.d.ts.map