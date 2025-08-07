import { Request, Response } from 'express';
export type CustomerSortField = 'name' | 'phone' | 'address' | 'type';
export declare class CustomerController {
    static getAllCustomers(req: Request, res: Response): Promise<Response>;
    static getCustomer(req: Request, res: Response): Promise<Response>;
    static createCustomer(req: Request, res: Response): Promise<Response>;
    static updateCustomer(req: Request, res: Response): Promise<Response>;
    static deleteCustomer(req: Request, res: Response): Promise<Response>;
    static getCustomerStats(req: Request, res: Response): Promise<Response>;
    static searchCustomers(req: Request, res: Response): Promise<Response>;
    static deleteMultipleCustomers(req: Request, res: Response): Promise<Response>;
}
//# sourceMappingURL=controller.d.ts.map