import { Request, Response } from 'express';
export declare class ImportController {
    static importExcel(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static importCSV(req: Request, res: Response): Promise<void>;
    static importCustomers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static downloadTemplate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static validateTransactionData(data: any, rowNumber: number): {
        isValid: boolean;
        data: any;
        errors: string[];
        warnings: string[];
    };
    static validateCustomerData(data: any, rowNumber: number): {
        isValid: boolean;
        data: any;
        errors: string[];
        warnings: string[];
    };
}
//# sourceMappingURL=controller.d.ts.map