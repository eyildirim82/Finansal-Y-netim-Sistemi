import { Request, Response } from 'express';
export declare class ExtractController {
    uploadExcel(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    private processExtractData;
    private findOrCreateCustomer;
    private generateCustomerCode;
    private filterNewTransactions;
    private generateTransactionKey;
    private updateCustomerBalances;
    getExtracts(req: Request, res: Response): Promise<void>;
    getExtractDetail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    validateBalances(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private calculateBalances;
    deleteOldExtracts(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteExtract(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=controller.d.ts.map