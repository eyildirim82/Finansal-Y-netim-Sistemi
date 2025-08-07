import { Request, Response } from 'express';
export declare class ExtractController {
    uploadExcel(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    private processExtractData;
    private findOrCreateCustomer;
    private generateCustomerCode;
    getExtracts(req: Request, res: Response): Promise<void>;
    getExtractDetail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    validateBalances(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private calculateBalances;
}
//# sourceMappingURL=controller.d.ts.map